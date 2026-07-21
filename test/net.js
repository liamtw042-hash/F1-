#!/usr/bin/env node
/* Headless multiplayer protocol test.
   Simulates a host session and a client mirror session connected by fake
   in-memory channels, runs 40s of racing, and asserts:
   - handshake (hello/welcome/lobby) works
   - client mirror builds the exact same car list from the start message
   - client's view of host-simulated AI cars tracks the host within meters
   - host's view of the client-driven car tracks the client within meters
   - lap counts propagate, race end delivers results to the client         */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, Math, JSON, Buffer, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['js/tracks.js', 'js/net.js', 'js/f1.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
}
const { RaceSession, AIBrain } = sandbox.F1;
const { NetHost, NetClient, applyStatePacket } = sandbox.F1NET;

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// fake paired data channels with ~1 frame of latency
function makePair() {
    const qAB = [], qBA = [];
    const a = { send: s => qAB.push(s), onmessage: null, onclose: null };
    const b = { send: s => qBA.push(s), onmessage: null, onclose: null };
    const pump = () => {
        let guard = 0;
        while ((qAB.length || qBA.length) && guard++ < 1000) {
            if (qAB.length) { const m = qAB.shift(); if (b.onmessage) b.onmessage({ data: m }); }
            if (qBA.length) { const m = qBA.shift(); if (a.onmessage) a.onmessage({ data: m }); }
        }
    };
    return { a, b, pump };
}

const fail = (msg) => { console.error('✗ ' + msg); process.exit(1); };

// ---- handshake ----
const { a: hostChan, b: clientChan, pump } = makePair();
const host = new NetHost();
host.attach(hostChan);

let clientStartMsg = null, clientResults = null, lobbySeen = null;
const client = new NetClient(clientChan, {
    onLobby: p => { lobbySeen = p; },
    onStart: m => { clientStartMsg = m; },
    onEnd: r => { clientResults = r; }
});
client.hello('SchoolMate', 3);
pump();
if (client.id !== 1) fail(`welcome id: expected 1, got ${client.id}`);
if (!lobbySeen || lobbySeen[0].name !== 'SchoolMate') fail('lobby not received');
console.log('✓ handshake: hello → welcome → lobby');

// ---- host builds session, sends start ----
const hostSession = new RaceSession({
    trackKey: 'monza', laps: 2, weather: 'DRY', difficulty: 'MEDIUM',
    players: [{ teamIdx: 0 }],
    remotePlayers: host.slots.map(s => ({ id: s.id, name: s.name, team: s.team })),
    aiCount: 5, rng: mulberry32(77)
});
const startMsg = host.startMsg(hostSession, { trackKey: 'monza', laps: 2, weather: 'DRY', difficulty: 'MEDIUM' });
host.broadcast(startMsg);
pump();
if (!clientStartMsg) fail('client never received start');
if (clientStartMsg.cars.length !== hostSession.cars.length) fail('car list length mismatch');

// ---- client builds mirror ----
const clientSession = new RaceSession({
    trackKey: 'monza', laps: 2, weather: 'DRY', difficulty: 'MEDIUM',
    mirror: { cars: clientStartMsg.cars, myPid: client.id }
});
const myCar = clientSession.cars.find(c => c.isPlayer);
if (!myCar) fail('client has no local car in mirror');
const myNid = myCar.id;
const hostViewOfMe = hostSession.cars.find(c => c.netPid === client.id);
if (!hostViewOfMe) fail('host has no car for remote player');
console.log(`✓ sessions built: ${hostSession.cars.length} cars each, client drives nid ${myNid}`);

// wire client state application
client.opts.onState = (m) => applyStatePacket(clientSession, m, myNid);

// ---- race 40 seconds ----
const DT = 1 / 60;
// the client "drives" using an AI brain through the local player path
const clientBrain = new AIBrain(myCar, clientSession.cir, 0.93, mulberry32(5));
let frames = 0;
for (let T = 0; T < 44; T += DT) {
    frames++;
    // host side
    host.applyClientStates(hostSession);
    hostSession.step(DT, []);
    if (frames % 4 === 0) host.broadcast(host.stateMsg(hostSession));
    // client side
    const env = { wetness: clientSession.weather.wetness, ambient: 24, raceTime: clientSession.raceTime };
    clientSession.step(DT, [clientBrain.compute(clientSession.cars, env, DT)]);
    if (frames % 3 === 0) client.sendState(myCar);
    pump();
}

// ---- assertions ----
// 1. client's copy of a host AI car tracks the host position
const aiHost = hostSession.cars.find(c => !c.isPlayer && !c.isRemote);
const aiClient = clientSession.cars.find(c => c.id === aiHost.id);
const aiErr = Math.hypot(aiHost.x - aiClient.x, aiHost.y - aiClient.y);
if (aiErr > 20) fail(`client view of host AI drifted ${aiErr.toFixed(1)}m`);
console.log(`✓ client mirrors host AI within ${aiErr.toFixed(1)}m`);

// 2. host's copy of the client car tracks the client
const meErr = Math.hypot(hostViewOfMe.x - myCar.x, hostViewOfMe.y - myCar.y);
if (meErr > 20) fail(`host view of client car drifted ${meErr.toFixed(1)}m`);
if (hostViewOfMe.cumDist < 500) fail(`host sees client car stationary (cumDist ${hostViewOfMe.cumDist.toFixed(0)})`);
console.log(`✓ host mirrors client car within ${meErr.toFixed(1)}m (drove ${hostViewOfMe.cumDist.toFixed(0)}m)`);

// 3. lap counts propagate host→client
const lapsMatch = clientSession.cars.every(cc => {
    const hc = hostSession.cars.find(h => h.id === cc.id);
    return cc.isPlayer || Math.abs(hc.lapsDone - cc.lapsDone) <= 1;
});
if (!lapsMatch) fail('lap counts diverged between host and client');
console.log('✓ lap counts propagate');

// 4. positions propagate (client car pos should be a valid rank)
if (!(myCar.pos >= 1 && myCar.pos <= hostSession.cars.length)) fail('client car has no valid position');

// 5. end flow
hostSession._finish([...hostSession.cars].sort((a, b) => a.pos - b.pos));
host.broadcast({ t: 'end', results: hostSession.results });
pump();
if (!clientResults || clientResults.length !== hostSession.cars.length) fail('client did not receive results');
console.log('✓ results delivered to client');

// 6. codec round-trip
const { NET } = sandbox.F1NET;
const blob = { d: { type: 'offer', sdp: 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\n' } };
const rt = NET.unpack(NET.pack(blob));
if (rt.d.sdp !== blob.d.sdp) fail('invite code codec round-trip failed');
console.log('✓ invite code codec round-trips');

console.log('\nMultiplayer protocol test passed.');
