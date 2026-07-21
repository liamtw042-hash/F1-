#!/usr/bin/env node
/* Headless race simulator — proves the game core is playable.
   Runs a full AI race on every circuit and asserts:
   - every car completes the race distance
   - lap times are sane for the circuit length
   - no NaN positions / cars stay near the track
   Usage: node test/sim.js [laps]
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, Math, JSON, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['js/tracks.js', 'js/f1.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    vm.runInContext(src, sandbox, { filename: f });
}
const { RaceSession, U } = sandbox.F1;
const TRACK_DATA = sandbox.TRACK_DATA;

// Deterministic RNG so failures reproduce
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const LAPS = parseInt(process.argv[2] || '3', 10);
const DT = 1 / 60;
let failures = 0;

for (const key of Object.keys(TRACK_DATA)) {
    const t0 = Date.now();
    const s = new RaceSession({
        trackKey: key, laps: LAPS, weather: 'DRY', difficulty: 'MEDIUM',
        players: [], aiCount: 20, rng: mulberry32(1234)
    });
    const L = s.cir.length;
    const maxSimT = LAPS * 220 + 120;   // generous ceiling
    let simT = 0, steps = 0;
    let maxLat = 0;

    while (s.state !== 'finished' && simT < maxSimT) {
        s.step(DT, []);
        simT += DT; steps++;
        if (steps % 300 === 0) {
            for (const c of s.cars) {
                if (!isFinite(c.x) || !isFinite(c.y)) {
                    console.error(`  ✗ [${key}] NaN position for ${c.name} at t=${simT.toFixed(1)}s`);
                    failures++; simT = maxSimT; break;
                }
                const w = s.cir.at(c.idx).w;
                maxLat = Math.max(maxLat, Math.abs(c.lat) - w / 2);
            }
        }
    }

    const finished = s.cars.filter(c => c.finished).length;
    const laps = s.cars.map(c => c.lapsDone);
    const bests = s.cars.map(c => c.bestLap).filter(b => isFinite(b)).sort((a, b) => a - b);
    const med = bests[Math.floor(bests.length / 2)] || 0;

    const expectMin = L / 75;   // impossibly fast bound (avg 270 km/h Monaco would fail others fine)
    const expectMax = L / 22;   // slower than 80 km/h average = something's broken

    let ok = true;
    if (s.state !== 'finished') { console.error(`  ✗ [${key}] race never finished (${simT.toFixed(0)}s, laps: ${Math.min(...laps)}..${Math.max(...laps)})`); ok = false; }
    if (finished < s.cars.length) { console.error(`  ✗ [${key}] only ${finished}/${s.cars.length} cars finished`); ok = false; }
    if (!(med > expectMin && med < expectMax)) { console.error(`  ✗ [${key}] median best lap ${med.toFixed(1)}s outside sane band [${expectMin.toFixed(0)}, ${expectMax.toFixed(0)}]`); ok = false; }
    if (maxLat > 30) { console.error(`  ✗ [${key}] car strayed ${maxLat.toFixed(0)}m beyond track edge`); ok = false; }
    if (!ok) failures++;

    const p1 = s.results ? s.results[0] : null;
    console.log(`${ok ? '✓' : '✗'} ${key.padEnd(12)} ${LAPS} laps · winner ${p1 ? p1.name.padEnd(11) : '—'.padEnd(11)} · fastest ${U.fmtTime(bests[0] || 0)} · median ${U.fmtTime(med)} · race ${simT.toFixed(0)}s sim (${((Date.now() - t0) / 1000).toFixed(1)}s real)`);
}

if (failures) { console.error(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nAll circuits OK — game core races correctly.');
