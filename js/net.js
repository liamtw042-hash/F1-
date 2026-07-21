/* ============================================================
   Crazy Grand Prix — online multiplayer (serverless WebRTC)
   Host + up to 3 friends exchange copy-paste invite codes; after
   that everything flows P2P over data channels. Protocol cores
   (NetHost / NetClient) are transport-agnostic and unit-tested
   headless with fake channels.
   ============================================================ */
'use strict';

const NET = {
    COMPOUND_IDX: ['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'],
    STATE_HZ: 15,
    CLIENT_HZ: 20,

    pack(obj) {
        const json = JSON.stringify(obj);
        if (typeof btoa !== 'undefined') return btoa(unescape(encodeURIComponent(json)));
        return Buffer.from(json, 'utf8').toString('base64');
    },
    unpack(code) {
        code = code.trim();
        const json = typeof atob !== 'undefined'
            ? decodeURIComponent(escape(atob(code)))
            : Buffer.from(code, 'base64').toString('utf8');
        return JSON.parse(json);
    },

    r2: v => Math.round(v * 100) / 100,
    r3: v => Math.round(v * 1000) / 1000
};

/* ---------------- host protocol core ---------------- */
class NetHost {
    constructor() {
        this.slots = [];          // {id, name, team, chan, alive}
        this.nextId = 1;
        this.latest = {};         // pid -> last client state array
        this.onLobbyChange = null;
        this.started = false;
    }

    attach(chan) {
        const slot = { id: null, name: '?', team: 2, chan, alive: true };
        chan.onmessage = (ev) => {
            let msg;
            try { msg = JSON.parse(typeof ev === 'string' ? ev : ev.data); } catch { return; }
            this._onMsg(slot, msg);
        };
        chan.onclose = () => {
            slot.alive = false;
            this.slots = this.slots.filter(s => s !== slot);
            this._lobby();
        };
        return slot;
    }

    _onMsg(slot, msg) {
        if (msg.t === 'hello') {
            if (slot.id === null) {
                slot.id = this.nextId++;
                slot.name = String(msg.name || 'Mate').slice(0, 12);
                slot.team = Math.max(0, Math.min(9, msg.team | 0));
                this.slots.push(slot);
                this._send(slot, { t: 'welcome', id: slot.id });
            }
            this._lobby();
        } else if (msg.t === 'c' && slot.id !== null) {
            this.latest[slot.id] = msg.st;
        }
    }

    _send(slot, obj) {
        try { if (slot.alive) slot.chan.send(JSON.stringify(obj)); } catch (e) { /* peer gone */ }
    }

    broadcast(obj) { for (const s of this.slots) this._send(s, obj); }

    _lobby() {
        this.broadcast({ t: 'lobby', players: this.slots.map(s => ({ id: s.id, name: s.name, team: s.team })) });
        if (this.onLobbyChange) this.onLobbyChange(this.slots);
    }

    startMsg(session, settings) {
        this.started = true;
        return {
            t: 'start',
            settings,
            cars: session.cars.map(c => ({
                nid: c.id, name: c.name, num: c.num,
                teamIdx: Math.max(0, CFG.TEAMS.indexOf(c.team)),
                comp: NET.COMPOUND_IDX.indexOf(c.compound),
                pid: c.netPid ?? -1,
                host: !!c.isPlayer && !c.isRemote
            }))
        };
    }

    stateMsg(session) {
        return {
            t: 's', rt: NET.r2(session.raceTime), cd: NET.r2(session.countdown),
            state: session.state === 'finished' ? 2 : session.state === 'racing' ? 1 : 0,
            wet: NET.r2(session.weather.wetness),
            cars: session.cars.map(c => [
                c.id, NET.r2(c.x), NET.r2(c.y), NET.r3(c.heading), NET.r2(c.v),
                c.lapsDone, c.pos, c.drsOpen ? 1 : 0,
                Math.round(c.wear * 100), NET.COMPOUND_IDX.indexOf(c.compound),
                c.finished ? 1 : 0, c.pitStopActive ? 1 : 0
            ])
        };
    }

    /* copy the latest network inputs onto the host session's remote cars */
    applyClientStates(session) {
        for (const c of session.cars) {
            if (!c.isRemote) continue;
            const st = this.latest[c.netPid];
            if (st) c._net = { x: st[0], y: st[1], heading: st[2], v: st[3], laps: st[4], drs: st[5], t: session.raceTime };
        }
    }
}

/* ---------------- client protocol core ---------------- */
class NetClient {
    constructor(chan, opts) {
        this.chan = chan;
        this.opts = opts || {};
        this.id = null;
        this.players = [];
        chan.onmessage = (ev) => {
            let msg;
            try { msg = JSON.parse(typeof ev === 'string' ? ev : ev.data); } catch { return; }
            this._onMsg(msg);
        };
        chan.onclose = () => { if (this.opts.onClose) this.opts.onClose(); };
    }

    hello(name, team) {
        this._send({ t: 'hello', name, team });
    }

    _send(obj) { try { this.chan.send(JSON.stringify(obj)); } catch (e) { /* gone */ } }

    _onMsg(msg) {
        const o = this.opts;
        switch (msg.t) {
            case 'welcome': this.id = msg.id; break;
            case 'lobby': this.players = msg.players; if (o.onLobby) o.onLobby(msg.players); break;
            case 'start': if (o.onStart) o.onStart(msg); break;
            case 's': if (o.onState) o.onState(msg); break;
            case 'end': if (o.onEnd) o.onEnd(msg.results); break;
        }
    }

    sendState(car) {
        this._send({
            t: 'c',
            st: [NET.r2(car.x), NET.r2(car.y), NET.r3(car.heading), NET.r2(car.v),
                 car.lapsDone, car.drsOpen ? 1 : 0]
        });
    }
}

/* apply a host state packet to a mirror/host session */
function applyStatePacket(session, msg, myNid) {
    session.netWetness = msg.wet;
    if (msg.state === 1 && session.state === 'countdown' && msg.cd <= 0) session.state = 'racing';
    for (const arr of msg.cars) {
        const [nid, x, y, heading, v, laps, pos, drs, wear, compIdx, fin, pit] = arr;
        const car = session.cars.find(c => c.id === nid);
        if (!car) continue;
        car.pos = pos;
        if (nid === myNid) continue;      // never override the locally-driven car
        car._net = { x, y, heading, v, laps, t: session.raceTime };
        car.lapsDone = laps;
        car.currentLap = Math.max(1, Math.min(laps + 1, car.totalLaps));
        car.drsOpen = !!drs;
        car.wear = wear / 100;
        car.compound = NET.COMPOUND_IDX[compIdx] || car.compound;
        car.finished = !!fin;
        car.pitStopActive = !!pit;
    }
}

/* smooth a remote car toward its network target and keep arc tracking alive */
function smoothRemoteCar(car, cir, dt) {
    const n = car._net;
    if (!n) return;
    // dead-reckon forward from the last packet, then converge
    const tx = n.x + Math.cos(n.heading) * n.v * Math.min(0.25, Math.max(0, dt));
    const tz = n.y + Math.sin(n.heading) * n.v * Math.min(0.25, Math.max(0, dt));
    const k = Math.min(1, dt * 10);
    const err = Math.hypot(car.x - n.x, car.y - n.y);
    if (err > 30) { car.x = n.x; car.y = n.y; }     // teleport on big desync
    else { car.x += (tx - car.x) * k; car.y += (tz - car.y) * k; }
    let dh = n.heading - car.heading;
    while (dh > Math.PI) dh -= 2 * Math.PI;
    while (dh < -Math.PI) dh += 2 * Math.PI;
    car.heading += dh * k;
    car.v = n.v;
    // keep arc/cumDist tracking so DRS, gaps and minimap stay correct
    const idx = cir.nearest(car.x, car.y, car.idx);
    const sp = cir.at(idx);
    car.lat = (car.x - sp.x) * sp.nx + (car.y - sp.y) * sp.ny;
    const newArc = idx * cir.ds;
    if (car.idx >= 0) {
        const d = ((newArc - car.arc) % cir.length + cir.length * 1.5) % cir.length - cir.length / 2;
        if (Math.abs(d) < 60) car.cumDist += d;
    }
    car.idx = idx; car.arc = newArc;
}

if (typeof globalThis !== 'undefined') {
    globalThis.F1NET = { NET, NetHost, NetClient, applyStatePacket, smoothRemoteCar };
}

/* ============================================================
   WebRTC transport (browser only)
   ============================================================ */
if (typeof window !== 'undefined' && typeof RTCPeerConnection !== 'undefined') {

class Peer {
    constructor() {
        this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        this.chan = null;
        this.onOpen = null;
        this.onClose = null;
    }

    _wireChannel(ch) {
        this.chan = ch;
        ch.onopen = () => { if (this.onOpen) this.onOpen(); };
        ch.onclose = () => { if (this.onClose) this.onClose(); };
    }

    _iceComplete() {
        return new Promise(res => {
            if (this.pc.iceGatheringState === 'complete') return res();
            const check = () => {
                if (this.pc.iceGatheringState === 'complete') {
                    this.pc.removeEventListener('icegatheringstatechange', check);
                    res();
                }
            };
            this.pc.addEventListener('icegatheringstatechange', check);
            setTimeout(res, 4000);   // fallback: ship what we have
        });
    }

    /* host side: create an invite code */
    async createInvite() {
        this._wireChannel(this.pc.createDataChannel('cgp', { ordered: false, maxRetransmits: 0 }));
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        await this._iceComplete();
        return NET.pack({ v: 1, d: this.pc.localDescription });
    }

    /* host side: accept the friend's reply code */
    async acceptReply(code) {
        const { d } = NET.unpack(code);
        await this.pc.setRemoteDescription(d);
    }

    /* joiner side: consume invite, produce reply code */
    async answerInvite(code) {
        const { d } = NET.unpack(code);
        await new Promise((res, rej) => {
            this.pc.ondatachannel = (ev) => { this._wireChannel(ev.channel); res(); };
            this.pc.setRemoteDescription(d)
                .then(() => this.pc.createAnswer())
                .then(a => this.pc.setLocalDescription(a))
                .then(() => res())
                .catch(rej);
        });
        await this._iceComplete();
        return NET.pack({ v: 1, d: this.pc.localDescription });
    }

    close() { try { this.pc.close(); } catch (e) { /* already closed */ } }
}

globalThis.CGPPeer = Peer;

} /* end browser guard */
