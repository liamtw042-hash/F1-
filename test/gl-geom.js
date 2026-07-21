#!/usr/bin/env node
/* Headless test for the WebGL geometry builders: builds the full low-poly
   world for every circuit and every team car, asserting finite vertices,
   sane counts, and a seamlessly looping elevation profile. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, Math, JSON, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['js/tracks.js', 'js/f1.js', 'js/gl.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
}
const { Circuit, CFG } = sandbox.F1;
const { heightProfile, buildWorld, buildCar, buildShadow, M4 } = sandbox.F1GL;
const TRACK_DATA = sandbox.TRACK_DATA;

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const finite = (arr, what) => {
    for (let i = 0; i < arr.length; i++) {
        if (!isFinite(arr[i])) throw new Error(`non-finite value in ${what} at index ${i}`);
    }
};

let failures = 0;
for (const key of Object.keys(TRACK_DATA)) {
    try {
        const def = TRACK_DATA[key];
        const cir = new Circuit(def);
        const H = heightProfile(cir, def.hills ?? 7);
        finite(H, `${key} heights`);
        // elevation must loop: ends meet within slope tolerance
        const seam = Math.abs(H[0] - H[cir.N - 1]);
        if (seam > 1.0) throw new Error(`elevation seam ${seam.toFixed(2)}m at start line`);
        const maxSlope = Math.max(...Array.from({ length: cir.N }, (_, i) =>
            Math.abs(H[(i + 1) % cir.N] - H[i]) / cir.ds));
        if (maxSlope > 0.20) throw new Error(`slope ${(maxSlope * 100).toFixed(0)}% too steep`);

        const world = buildWorld(cir, def, H, mulberry32(9));
        finite(world.pos, `${key} world pos`);
        finite(world.nrm, `${key} world nrm`);
        finite(world.col, `${key} world col`);
        if (world.n < 5000) throw new Error(`suspiciously small world: ${world.n} verts`);
        if (world.n !== world.pos.length / 3 || world.pos.length !== world.nrm.length || world.pos.length !== world.col.length) {
            throw new Error('buffer length mismatch');
        }
        console.log(`✓ ${key.padEnd(12)} world ${String(world.n).padStart(6)} verts · hills ±${(def.hills ?? 7)}m · max slope ${(maxSlope * 100).toFixed(1)}%`);
    } catch (e) {
        console.error(`✗ ${key}: ${e.message}`);
        failures++;
    }
}

// all team cars + shadow
try {
    for (const t of CFG.TEAMS) {
        const car = buildCar(t);
        finite(car.pos, `car ${t.short}`);
        if (car.n < 100) throw new Error(`car mesh too small for ${t.short}`);
    }
    const sh = buildShadow();
    finite(sh.pos, 'shadow');
    console.log(`✓ ${CFG.TEAMS.length} team car meshes + shadow OK`);
} catch (e) { console.error(`✗ cars: ${e.message}`); failures++; }

// matrix sanity: project a point in front of a lookAt camera — must be in view
try {
    const proj = M4.persp(1.2, 16 / 9, 0.3, 900);
    const view = M4.lookAt(0, 5, 10, 0, 0, 0);
    const mvp = M4.mul(proj, view);
    const p = [0, 0, 0, 1];
    const clip = [0, 1, 2, 3].map(r => mvp[r] * p[0] + mvp[4 + r] * p[1] + mvp[8 + r] * p[2] + mvp[12 + r] * p[3]);
    const ndcZ = clip[2] / clip[3];
    if (!(ndcZ > -1 && ndcZ < 1)) throw new Error(`lookAt target not in frustum (ndc z=${ndcZ.toFixed(2)})`);
    console.log('✓ matrix math: camera frustum sane');
} catch (e) { console.error(`✗ matrices: ${e.message}`); failures++; }

if (failures) { console.error(`${failures} FAILURE(S)`); process.exit(1); }
console.log('GL geometry test passed.');
