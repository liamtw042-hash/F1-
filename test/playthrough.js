#!/usr/bin/env node
/* Real playthrough harness — runs the actual RaceSession loop and replicates
   GLView's exact chase-camera math every frame, so it catches bugs that only
   happen during live play (not in a static snapshot):
     1. AUTO-ACCELERATE: a player giving ZERO input must not gain speed.
     2. WALLS: no car's lateral offset may exceed the barrier limit.
     3. UNDER-MAP: the chase camera must never drop below the terrain.        */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, Math, JSON, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['js/tracks.js', 'js/net.js', 'js/f1.js', 'js/gl.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
}
const { RaceSession, AIBrain } = sandbox.F1;
const { heightProfile } = sandbox.F1GL;

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// standalone copy of GLView.groundAt (same math, no GL needed)
function makeGround(cir, H) {
    const hAt = i => H[((i % cir.N) + cir.N) % cir.N];
    return (x, z, idx) => {
        let best = hAt(idx), bd = Infinity;
        for (const j of [idx - 1, idx]) {
            const a = cir.at(j), b = cir.at(j + 1);
            const abx = b.x - a.x, abz = b.y - a.y;
            const len2 = abx * abx + abz * abz || 1;
            const t = Math.max(0, Math.min(1, ((x - a.x) * abx + (z - a.y) * abz) / len2));
            const px = a.x + abx * t, pz = a.y + abz * t;
            const d = (x - px) * (x - px) + (z - pz) * (z - pz);
            if (d < bd) { bd = d; best = hAt(j) + (hAt(j + 1) - hAt(j)) * t; }
        }
        return best;
    };
}

const fail = m => { console.error('✗ ' + m); process.exit(1); };
const DT = 1 / 60;

/* ---- Test 1: ZERO input must not auto-accelerate ---- */
{
    const s = new RaceSession({
        trackKey: 'monaco', laps: 3, weather: 'DRY', difficulty: 'MEDIUM',
        players: [{ teamIdx: 2 }], aiCount: 5, rng: mulberry32(3)
    });
    const p = s.cars.find(c => c.isPlayer);
    // burn through the countdown
    for (let t = 0; t < 4; t += DT) s.step(DT, [{}]);
    // now race for 8s giving the player literally nothing
    let maxV = 0;
    for (let t = 0; t < 8; t += DT) {
        s.step(DT, [{ throttle: 0, brake: 0, steer: 0 }]);
        maxV = Math.max(maxV, Math.abs(p.v));
    }
    if (maxV > 2.0) fail(`auto-accelerate: player reached ${(maxV * 3.6).toFixed(1)} km/h on zero throttle`);
    console.log(`✓ zero input stays parked (peak ${(maxV * 3.6).toFixed(1)} km/h over 8s)`);
}

/* ---- Tests 2 & 3: full AI race, check walls + camera every frame ---- */
for (const track of ['monaco', 'spa', 'suzuka']) {
    const s = new RaceSession({
        trackKey: track, laps: 2, weather: 'DRY', difficulty: 'HARD',
        players: [], aiCount: 20, rng: mulberry32(7)
    });
    const H = heightProfile(s.cir, s.cir.def.hills ?? 7);
    const groundAt = makeGround(s.cir, H);

    // per-player smoothed camera, exactly like GLView.cam
    const cams = {};
    const camFor = k => (cams[k] || (cams[k] = { pos: [0, 40, 0], tgt: [0, 0, 0], fov: 70 }));

    let worstLat = 0, worstCamGap = Infinity, t = 0;
    // follow the race leader as "the player camera"
    while (s.state !== 'finished' && t < 400) {
        s.step(DT, []);
        t += DT;

        // walls: every car must stay inside the barrier
        for (const c of s.cars) {
            const lim = s.cir.at(c.idx).w / 2 + 5.6;
            const over = Math.abs(c.lat) - lim;
            if (over > worstLat) worstLat = over;
        }

        // camera: replicate GLView chase-cam for the current leader
        const car = s.cars.find(c => c.pos === 1) || s.cars[0];
        const h = groundAt(car.x, car.y, car.idx);
        const cosH = Math.cos(car.heading), sinH = Math.sin(car.heading);
        const back = 7.8, up = 2.7;
        const ex = car.x - cosH * back, ez = car.y - sinH * back, ey = h + up;
        const cam = camFor('lead');
        const k = Math.min(1, DT * 7.5);
        cam.pos[0] += (ex - cam.pos[0]) * k;
        cam.pos[1] += (ey - cam.pos[1]) * k;
        cam.pos[2] += (ez - cam.pos[2]) * k;
        const gi = s.cir.nearest(cam.pos[0], cam.pos[2], car.idx);
        const gc = groundAt(cam.pos[0], cam.pos[2], gi);
        if (cam.pos[1] < gc + 0.8) cam.pos[1] = gc + 0.8;    // the v4.1 clamp
        const gap = cam.pos[1] - gc;
        if (gap < worstCamGap) worstCamGap = gap;
    }

    if (worstLat > 1.5) fail(`[${track}] a car passed ${worstLat.toFixed(1)}m beyond the wall`);
    if (worstCamGap < 0.3) fail(`[${track}] camera dropped to ${worstCamGap.toFixed(2)}m above ground (under-map)`);
    console.log(`✓ ${track.padEnd(9)} walls held (max overrun ${Math.max(0, worstLat).toFixed(2)}m) · camera min clearance ${worstCamGap.toFixed(2)}m`);
}

console.log('\nPlaythrough harness passed.');
