#!/usr/bin/env node
/* Headless smoke test for Renderer3D: renders a live race through a stub
   canvas context in cockpit, chase, and split-screen modes. Catches crashes,
   typos, and undefined references in the projection renderer. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, Math, JSON, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['js/tracks.js', 'js/f1.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
}
const { RaceSession, Renderer3D } = sandbox.F1;
const TRACK_DATA = sandbox.TRACK_DATA;

// Universal ctx stub: every method exists and returns another stub-compatible
// object (covers gradients); property writes are accepted; numeric coercion -> 0.
function makeCtx() {
    let calls = 0;
    const stub = new Proxy({}, {
        get(t, p) {
            if (p === Symbol.toPrimitive) return () => 0;
            if (p === 'toString') return () => '[ctx-stub]';
            return (...args) => {
                calls++;
                for (const a of args) {
                    if (typeof a === 'number' && !isFinite(a)) {
                        throw new Error(`non-finite argument to ctx.${String(p)}: ${args.join(',')}`);
                    }
                }
                return stub;
            };
        },
        set() { return true; }
    });
    return { stub, count: () => calls };
}

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

let failures = 0;
for (const key of Object.keys(TRACK_DATA)) {
    const s = new RaceSession({
        trackKey: key, laps: 2, weather: key === 'spa' ? 'HEAVY_RAIN' : 'DRY',
        difficulty: 'MEDIUM', players: [{ teamIdx: 2 }, { teamIdx: 4 }], aiCount: 18, rng: mulberry32(11)
    });
    const r3d = new Renderer3D();
    r3d.build(s.cir, TRACK_DATA[key], mulberry32(5));
    const { stub, count } = makeCtx();
    const players = s.cars.filter(c => c.isPlayer);
    const brains = players.map(p => new sandbox.F1.AIBrain(p, s.cir, 0.93, mulberry32(3)));
    const DT = 1 / 60;
    let T = 0, frames = 0;
    try {
        while (T < 40 && s.state !== 'finished') {
            const env = { wetness: s.weather.wetness, ambient: 24, raceTime: s.raceTime };
            s.step(DT, brains.map(b => b.compute(s.cars, env, DT)));
            T += DT;
            if (frames % 3 === 0) {
                const mode = ['cockpit', 'chase'][frames % 2];
                // single full-screen + split screen variants
                r3d.render(stub, s, players[0], { x: 0, y: 0, w: 1280, h: 720 }, mode, s.weather.wetness, s.raceTime);
                r3d.render(stub, s, players[0], { x: 0, y: 0, w: 1280, h: 360 }, mode, s.weather.wetness, s.raceTime);
                r3d.render(stub, s, players[1], { x: 0, y: 360, w: 1280, h: 360 }, mode, s.weather.wetness, s.raceTime);
            }
            frames++;
        }
        console.log(`✓ ${key.padEnd(12)} ${frames} frames rendered, ${count()} ctx calls, no crashes`);
    } catch (e) {
        console.error(`✗ ${key}: ${e.message}\n${e.stack.split('\n').slice(1, 4).join('\n')}`);
        failures++;
    }
}
if (failures) { console.error(`${failures} FAILURE(S)`); process.exit(1); }
console.log('Renderer3D smoke test passed.');
