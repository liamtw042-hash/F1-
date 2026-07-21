#!/usr/bin/env node
/* Contact-mechanics regression test.
   The rule: driving into another car usually costs YOU — heavy head-on punts
   destabilise the attacker and can break their front wing — UNLESS it's a
   clean hit on the leader's rear quarter, which sends THEM loose instead.  */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, Math, JSON, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['js/tracks.js', 'js/net.js', 'js/f1.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
}
const { RaceSession, stepCar } = sandbox.F1;

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const mk = () => new RaceSession({
    trackKey: 'monza', laps: 3, weather: 'DRY', difficulty: 'MEDIUM',
    players: [{ teamIdx: 0 }, { teamIdx: 1 }], aiCount: 0, rng: mulberry32(1)
});
const place = (s, att, vic, latOff, dv) => {
    const sp = s.cir.at(100);
    vic.x = sp.x; vic.y = sp.y; vic.heading = sp.ang; vic.idx = 100; vic.arc = 100 * s.cir.ds; vic.v = 40; vic.lat = 0;
    att.x = sp.x - sp.tx * 4.2 + sp.nx * latOff;
    att.y = sp.y - sp.ty * 4.2 + sp.ny * latOff;
    att.heading = sp.ang; att.idx = 99; att.arc = 99 * s.cir.ds; att.v = 40 + dv; att.lat = latOff;
    s.state = 'racing';
};
const fail = m => { console.error('✗ ' + m); process.exit(1); };

// 1. clean hit on the rear quarter → victim destabilised, attacker survives
let s = mk(); let [att, vic] = s.cars;
place(s, att, vic, 1.4, 12);
s.step(1 / 60, [{ throttle: 1 }, { throttle: 1 }]);
if (!(vic.slideT > 0.5)) fail(`clean hit: victim not destabilised (slideT=${vic.slideT})`);
if (att.wingDmg) fail('clean hit: attacker should not break wing');
console.log(`✓ clean hit sends the victim loose (slideT ${vic.slideT.toFixed(2)}) while attacker keeps pace`);

// 2. head-on punt → attacker loses big, breaks wing at high closing speed
s = mk(); [att, vic] = s.cars;
place(s, att, vic, 0.2, 15);
s.step(1 / 60, [{ throttle: 1 }, { throttle: 1 }]);
if (!(att.slideT > 0.3)) fail('head-on: attacker not destabilised');
if (!(att.v < 50)) fail(`head-on: attacker kept speed (${att.v})`);
if (!att.wingDmg) fail('head-on: no wing damage at dv=15');
if (!(vic.v > 38)) fail(`head-on: victim over-punished (${vic.v})`);
console.log('✓ head-on punt punishes the attacker: loose, slowed, wing broken; victim barely affected');

// 3. gentle side rub → minor penalty only, never damage
s = mk(); [att, vic] = s.cars;
place(s, att, vic, 1.2, 2);
s.step(1 / 60, [{ throttle: 1 }, { throttle: 1 }]);
if (att.wingDmg || vic.wingDmg) fail('rub caused wing damage');
if (vic.slideT > 0.01) fail('rub destabilised the victim');
console.log('✓ side rub stays a minor penalty');

// 4. collision cooldown: impulses don't restack every frame
s = mk(); [att, vic] = s.cars;
place(s, att, vic, 1.4, 12);
s.step(1 / 60, [{ throttle: 1 }, { throttle: 1 }]);
const slideAfterOne = vic.slideT;
s.step(1 / 60, [{ throttle: 1 }, { throttle: 1 }]);
if (vic.slideT > slideAfterOne + 0.2) fail('cooldown missing: impulse restacked next frame');
console.log('✓ collision cooldown prevents impulse spam');

// 5. pit stop repairs wing damage and restores pace
s = mk(); [att] = s.cars;
att.wingDmg = true;
const env = { wetness: 0, ambient: 24, raceTime: 0 };
att.pitStopActive = true; att.pitTimer = 0.01;
stepCar(att, {}, s.cir, env, 1 / 60);
if (att.wingDmg) fail('pit did not repair wing');
console.log('✓ pit stop repairs wing damage');

console.log('\nContact mechanics test passed.');
