/* ============================================================
   F1 RACING CHAMPIONSHIP — complete game engine
   Sections: CFG · Utils · Circuit · Physics · AI · Weather ·
             RaceSession (headless core) · Renderer · HUD ·
             Audio · Menu · Game · Boot
   ============================================================ */
'use strict';

/* ============================== CONFIG ============================== */
const CFG = {
    DT: 1 / 60,
    VMAX: 103,              // m/s hard cap (~371 km/h)
    MASS: 798,              // kg without fuel
    POWER: 735000,          // W
    ERS_POWER: 120000,      // W boost
    ERS_MAX: 4.0e6,         // J
    K_DRAG: 0.81,           // N/(m/s)^2
    K_DF: 1.55,             // downforce N/(m/s)^2
    MU: 1.75,               // reference tyre friction
    WHEELBASE: 3.6,
    G: 9.81,
    GEARS: [0, 3.2, 2.1, 1.55, 1.22, 0.98, 0.82, 0.70, 0.62],
    FINAL: 3.5,
    POINTS: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],

    COMPOUNDS: {
        SOFT:   { name: 'Soft',  letter: 'S', color: '#ff3333', grip: 1.13, wearRate: 1.75, optimal: 95, rainGrip: 0.30 },
        MEDIUM: { name: 'Medium',letter: 'M', color: '#ffdd00', grip: 1.00, wearRate: 1.00, optimal: 90, rainGrip: 0.33 },
        HARD:   { name: 'Hard',  letter: 'H', color: '#dddddd', grip: 0.94, wearRate: 0.60, optimal: 85, rainGrip: 0.36 },
        INTER:  { name: 'Inter', letter: 'I', color: '#00cc44', grip: 0.86, wearRate: 0.85, optimal: 75, rainGrip: 0.85 },
        WET:    { name: 'Wet',   letter: 'W', color: '#3399ff', grip: 0.78, wearRate: 0.55, optimal: 65, rainGrip: 1.00 }
    },

    WEATHERS: {
        DRY:        { name: 'Dry',        target: 0.0 },
        LIGHT_RAIN: { name: 'Light Rain', target: 0.45 },
        HEAVY_RAIN: { name: 'Heavy Rain', target: 0.90 },
        CHANGING:   { name: 'Changing',   target: 0.0, dynamic: true }
    },

    DIFFICULTY: { EASY: 0.88, MEDIUM: 0.93, HARD: 0.965, EXPERT: 0.995 },

    TEAMS: [
        { name: 'Red Bull Racing', short: 'RBR', c1: '#1e2a8a', c2: '#cc1e4a', drivers: ['Verstappen', 'Perez'] },
        { name: 'Mercedes-AMG',    short: 'MER', c1: '#00d2be', c2: '#aaaaaa', drivers: ['Hamilton', 'Russell'] },
        { name: 'Ferrari',         short: 'FER', c1: '#dc0000', c2: '#ffee00', drivers: ['Leclerc', 'Sainz'] },
        { name: 'McLaren',         short: 'MCL', c1: '#ff8000', c2: '#333333', drivers: ['Norris', 'Piastri'] },
        { name: 'Aston Martin',    short: 'AMR', c1: '#006f62', c2: '#cedc00', drivers: ['Alonso', 'Stroll'] },
        { name: 'Alpine',          short: 'ALP', c1: '#0090ff', c2: '#ff44aa', drivers: ['Gasly', 'Ocon'] },
        { name: 'Williams',        short: 'WIL', c1: '#0055ff', c2: '#ffffff', drivers: ['Albon', 'Sargeant'] },
        { name: 'Haas',            short: 'HAS', c1: '#eeeeee', c2: '#e8002d', drivers: ['Hulkenberg', 'Magnussen'] },
        { name: 'RB',              short: 'RB',  c1: '#1434cb', c2: '#88aaff', drivers: ['Tsunoda', 'Ricciardo'] },
        { name: 'Sauber',          short: 'SAU', c1: '#52e252', c2: '#111111', drivers: ['Bottas', 'Zhou'] }
    ],

    DRIVERS: [
        { name: 'Verstappen', num: 1,  team: 0, skill: 0.98, consistency: 0.96 },
        { name: 'Hamilton',   num: 44, team: 1, skill: 0.97, consistency: 0.96 },
        { name: 'Leclerc',    num: 16, team: 2, skill: 0.95, consistency: 0.90 },
        { name: 'Norris',     num: 4,  team: 3, skill: 0.94, consistency: 0.92 },
        { name: 'Alonso',     num: 14, team: 4, skill: 0.96, consistency: 0.95 },
        { name: 'Sainz',      num: 55, team: 2, skill: 0.91, consistency: 0.91 },
        { name: 'Russell',    num: 63, team: 1, skill: 0.91, consistency: 0.90 },
        { name: 'Perez',      num: 11, team: 0, skill: 0.89, consistency: 0.85 },
        { name: 'Piastri',    num: 81, team: 3, skill: 0.90, consistency: 0.88 },
        { name: 'Stroll',     num: 18, team: 4, skill: 0.80, consistency: 0.81 },
        { name: 'Gasly',      num: 10, team: 5, skill: 0.84, consistency: 0.84 },
        { name: 'Ocon',       num: 31, team: 5, skill: 0.83, consistency: 0.83 },
        { name: 'Albon',      num: 23, team: 6, skill: 0.84, consistency: 0.84 },
        { name: 'Tsunoda',    num: 22, team: 8, skill: 0.82, consistency: 0.79 },
        { name: 'Hulkenberg', num: 27, team: 7, skill: 0.80, consistency: 0.82 },
        { name: 'Magnussen',  num: 20, team: 7, skill: 0.78, consistency: 0.76 },
        { name: 'Ricciardo',  num: 3,  team: 8, skill: 0.83, consistency: 0.81 },
        { name: 'Bottas',     num: 77, team: 9, skill: 0.81, consistency: 0.84 },
        { name: 'Zhou',       num: 24, team: 9, skill: 0.76, consistency: 0.77 },
        { name: 'Sargeant',   num: 2,  team: 6, skill: 0.72, consistency: 0.72 }
    ],

    CONTROLS: [
        { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', drs: 'Space', ers: 'ShiftLeft', pit: 'KeyP', reset: 'KeyR' },
        { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', drs: 'Enter', ers: 'ShiftRight', pit: 'Slash', reset: 'Backslash' }
    ]
};

/* ============================== UTILS ============================== */
const U = {
    clamp: (v, a, b) => v < a ? a : v > b ? b : v,
    lerp: (a, b, t) => a + (b - a) * t,
    dist2: (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
    wrapAng(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; },
    wrapDelta(d, total) { d = d % total; if (d > total / 2) d -= total; if (d < -total / 2) d += total; return d; },
    fmtTime(s) {
        if (!isFinite(s) || s <= 0) return '--:--.---';
        const m = Math.floor(s / 60), sec = Math.floor(s % 60), ms = Math.floor((s % 1) * 1000);
        return `${m}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    },
    catmull(p0, p1, p2, p3, t) {
        const t2 = t * t, t3 = t2 * t;
        return {
            x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        };
    }
};

/* ============================== CIRCUIT ============================== */
class Circuit {
    constructor(def) {
        this.def = def;
        this.name = def.name;
        this.shortName = def.shortName;

        // 1. Dense Catmull-Rom sampling of control loop
        const cps = def.controlPoints, n = cps.length, dense = [];
        for (let i = 0; i < n; i++) {
            const p0 = cps[(i - 1 + n) % n], p1 = cps[i], p2 = cps[(i + 1) % n], p3 = cps[(i + 2) % n];
            for (let j = 0; j < 14; j++) {
                const t = j / 14, pt = U.catmull(p0, p1, p2, p3, t);
                dense.push({ x: pt.x, y: pt.y, w: U.lerp(p1.w, p2.w, t), kerb: !!(p1.kerb || (t > 0.5 && p2.kerb)) });
            }
        }

        // 2. Raw length → auto-scale coords so path length == real lapLength
        let raw = 0;
        for (let i = 0; i < dense.length; i++) {
            const a = dense[i], b = dense[(i + 1) % dense.length];
            raw += Math.hypot(b.x - a.x, b.y - a.y);
        }
        const scale = def.lapLength / raw;
        for (const p of dense) { p.x *= scale; p.y *= scale; }

        // 3. Even resample at ds spacing, interpolating WITHIN dense segments
        //    (dense spacing can exceed ds on long straights — naive walking
        //    would emit duplicate samples and corrupt tangents/curvature)
        this.length = def.lapLength;
        this.N = Math.max(420, Math.round(def.lapLength / 6.5));
        this.ds = this.length / this.N;
        const dn = dense.length;
        const cum = new Float64Array(dn + 1);
        for (let i = 0; i < dn; i++) {
            const a = dense[i], b = dense[(i + 1) % dn];
            cum[i + 1] = cum[i] + Math.hypot(b.x - a.x, b.y - a.y);
        }
        const total = cum[dn];
        const samples = [];
        let j = 0;
        for (let k = 0; k < this.N; k++) {
            const targ = (k * this.ds / this.length) * total;
            while (j < dn - 1 && cum[j + 1] < targ) j++;
            const a = dense[j], b = dense[(j + 1) % dn];
            const segLen = cum[j + 1] - cum[j];
            const t = segLen > 1e-9 ? (targ - cum[j]) / segLen : 0;
            samples.push({
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                w: a.w + (b.w - a.w) * t,
                kerb: t < 0.5 ? a.kerb : b.kerb
            });
        }
        this.samples = samples;

        // 4. Tangents, normals, curvature, corner speeds
        const N = this.N;
        for (let i = 0; i < N; i++) {
            const a = samples[(i - 1 + N) % N], b = samples[(i + 1) % N];
            const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
            const s = samples[i];
            s.tx = dx / l; s.ty = dy / l;
            s.nx = -s.ty; s.ny = s.tx;
            s.ang = Math.atan2(dy, dx);
        }
        const muKdfM = CFG.MU * CFG.K_DF / CFG.MASS;
        for (let i = 0; i < N; i++) {
            const a = samples[(i - 2 + N) % N], b = samples[(i + 2) % N];
            const dAng = Math.abs(U.wrapAng(b.ang - a.ang));
            const kappa = dAng / (4 * this.ds);
            samples[i].curv = kappa;
            samples[i].vc = kappa > muKdfM + 1e-6
                ? Math.min(CFG.VMAX, Math.sqrt(CFG.MU * CFG.G / (kappa - muKdfM)))
                : CFG.VMAX;
        }
        // safety smooth: corner speed at i = min over window
        const vcRaw = samples.map(s => s.vc);
        for (let i = 0; i < N; i++) {
            let m = Infinity;
            for (let j = -3; j <= 3; j++) m = Math.min(m, vcRaw[(i + j + N) % N]);
            samples[i].vc = m;
        }

        // 5. DRS zones (arc meters) & sectors
        this.drsZones = (def.drsZonesList || []).map(z => ({ s0: z.start * this.length, s1: z.end * this.length }));
        this.sec1 = def.sectors[0] * this.length;
        this.sec2 = def.sectors[1] * this.length;
        this.pitArc = (def.pitEntry || 0.95) * this.length;

        // 6. Bounds
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        for (const s of samples) {
            minX = Math.min(minX, s.x); maxX = Math.max(maxX, s.x);
            minY = Math.min(minY, s.y); maxY = Math.max(maxY, s.y);
        }
        this.bounds = { minX, minY, maxX, maxY };
    }

    at(i) { return this.samples[((i % this.N) + this.N) % this.N]; }

    nearest(x, y, lastIdx) {
        const N = this.N;
        let best = -1, bd = Infinity;
        if (lastIdx >= 0) {
            for (let j = -50; j <= 50; j++) {
                const i = ((lastIdx + j) % N + N) % N;
                const s = this.samples[i];
                const d = U.dist2(x, y, s.x, s.y);
                if (d < bd) { bd = d; best = i; }
            }
        } else {
            for (let i = 0; i < N; i++) {
                const s = this.samples[i];
                const d = U.dist2(x, y, s.x, s.y);
                if (d < bd) { bd = d; best = i; }
            }
        }
        return best;
    }

    inDRS(arc) {
        for (const z of this.drsZones) {
            if (z.s0 <= z.s1) { if (arc >= z.s0 && arc <= z.s1) return true; }
            else if (arc >= z.s0 || arc <= z.s1) return true;
        }
        return false;
    }

    sectorOf(arc) { return arc < this.sec1 ? 1 : arc < this.sec2 ? 2 : 3; }
}

/* ============================== CAR / PHYSICS ============================== */
function createCar(o) {
    return {
        id: o.id, name: o.name, num: o.num, team: o.team,
        c1: o.team.c1, c2: o.team.c2, short: o.team.short,
        isPlayer: !!o.isPlayer, playerIndex: o.playerIndex ?? -1,
        skill: o.skill ?? 0.85, consistency: o.consistency ?? 0.85,

        x: 0, y: 0, heading: 0, v: 0, steerS: 0,
        idx: -1, arc: 0, cumDist: 0, lat: 0,

        lapsDone: 0, totalLaps: o.totalLaps, currentLap: 1,
        lapStartT: 0, lastLap: 0, bestLap: Infinity,
        sector: 1, sectorStartT: 0, sectors: [0, 0, 0], bestSectors: [Infinity, Infinity, Infinity],

        compound: o.compound || 'MEDIUM', wear: 0, temp: 55,
        fuel: o.fuel ?? 100, ers: CFG.ERS_MAX * 0.6, ersDeploying: false,
        drsAvailable: false, drsOpen: false, gapAheadSec: 99, gapLeaderM: 0,

        gear: 1, rpm: 6000, throttle: 0, brake: 0,
        slide: false, offTrack: false, onKerb: false, gearFlash: 0,
        stuckT: 0, resetFlash: 0, gripRatio: 1, ghostT: 0, contact: 0,

        pitRequest: false, pitStopActive: false, pitTimer: 0, pitCount: 0, pendingCompound: null,
        finished: false, finishTime: 0, pos: 0, points: 0,
        justLapped: false, justPitted: false, justReset: false
    };
}

function stepCar(car, inp, cir, env, dt) {
    car.justLapped = car.justPitted = car.justReset = false;
    if (car.finished) { car.v = Math.max(0, car.v - 8 * dt); moveCar(car, cir, dt); return; }

    // Pit stop: frozen in box
    if (car.pitStopActive) {
        car.v = 0; car.throttle = 0; car.brake = 0;
        car.pitTimer -= dt;
        if (car.pitTimer <= 0) {
            car.pitStopActive = false;
            car.compound = car.pendingCompound || car.compound;
            car.wear = 0; car.temp = 55;
            car.pitRequest = false; car.pitCount++;
            car.justPitted = true;
            car.lastPitT = env.raceTime;
        }
        return;
    }

    const thr = U.clamp(inp.throttle || 0, 0, 1);
    const brk = U.clamp(inp.brake || 0, 0, 1);
    car.throttle = thr; car.brake = brk;

    // --- Grip model ---
    const comp = CFG.COMPOUNDS[car.compound];
    const wet = env.wetness;
    const compGrip = U.lerp(comp.grip, comp.rainGrip * 1.12, wet);
    const wearF = 1 - 0.28 * Math.pow(car.wear, 1.6);
    let tempF = 1;
    if (car.temp < comp.optimal - 20) tempF = 1 - U.clamp((comp.optimal - 20 - car.temp) / 60, 0, 0.13);
    else if (car.temp > comp.optimal + 22) tempF = 1 - U.clamp((car.temp - comp.optimal - 22) / 55, 0, 0.18);

    const s = car.idx >= 0 ? cir.at(car.idx) : cir.at(0);
    const halfW = s.w / 2;
    car.offTrack = Math.abs(car.lat) > halfW + 0.8;
    car.onKerb = !!s.kerb && Math.abs(car.lat) > halfW - 1.4 && !car.offTrack;
    const surfF = car.offTrack ? 0.42 : 1;

    const mu = CFG.MU * compGrip * wearF * tempF * surfF;
    car.gripRatio = mu / CFG.MU;

    const m = CFG.MASS + car.fuel;
    const df = CFG.K_DF * car.v * car.v;
    const aLatMax = Math.max(4, mu * (CFG.G + df / m));

    // --- Longitudinal ---
    let F = 0;
    car.ersDeploying = !!inp.ers && car.ers > 1000 && thr > 0.2 && !car.offTrack;
    if (thr > 0 && car.v >= -0.1) {
        let P = CFG.POWER * thr * (car.fuel <= 0 ? 0.4 : 1);
        if (car.ersDeploying) P += CFG.ERS_POWER;
        const traction = mu * (0.62 * m * CFG.G + 0.5 * df) * 1.1;
        F = Math.min(P / Math.max(car.v, 5), traction);
    }
    const kd = CFG.K_DRAG * (car.drsOpen ? 0.80 : 1);
    const drag = kd * car.v * car.v + 0.012 * m * CFG.G + 0.3 * Math.abs(car.v) + (car.offTrack ? 900 + 45 * Math.abs(car.v) : 0);
    const Fb = brk * 0.92 * mu * (m * CFG.G + df);

    let a;
    if (car.v > 0.3) a = (F - drag - Fb) / m;
    else if (brk > 0.3 && car.v <= 0.3) a = -2.5;                    // reverse
    else if (car.v < -0.05) a = (thr > 0.1 ? 6 : 2) + 0 * F;         // recover from reverse
    else a = (F - Fb) / m - 0.3;
    car.v = U.clamp(car.v + a * dt, -5, CFG.VMAX);

    // --- Steering (grip-limited curvature) ---
    car.steerS += (U.clamp(inp.steer || 0, -1, 1) - car.steerS) * Math.min(1, 10 * dt);
    const dMax = U.clamp(Math.atan2(CFG.WHEELBASE * aLatMax, Math.max(car.v, 7) ** 2) * 1.25, 0.06, 0.42);
    const delta = car.steerS * dMax;
    const kDes = Math.abs(Math.tan(delta)) / CFG.WHEELBASE;
    const kMax = aLatMax / Math.max(car.v * car.v, 30);
    const kEff = Math.min(kDes, kMax);
    car.slide = kDes > kMax * 1.03 && Math.abs(car.v) > 8;
    if (car.slide) car.v -= car.v * 0.38 * Math.min(1, kDes / kMax - 1) * dt;
    car.heading += car.v * kEff * Math.sign(delta || car.steerS) * dt * (car.v < 0 ? -1 : 1);
    car.heading = U.wrapAng(car.heading);

    moveCar(car, cir, dt);

    // --- ERS ---
    if (car.ersDeploying) car.ers = Math.max(0, car.ers - CFG.ERS_POWER * dt);
    car.ers = Math.min(CFG.ERS_MAX, car.ers + (90000 * brk + (thr < 0.1 && car.v > 20 ? 8000 : 0)) * dt);

    // --- DRS auto-close ---
    car.drsOpen = !!inp.drs && car.drsAvailable && brk < 0.15;

    // --- Fuel ---
    car.fuel = Math.max(0, car.fuel - 0.048 * thr * dt);

    // --- Tyres ---
    const latFrac = Math.min(1.3, car.v * car.v * kEff / aLatMax);
    const use = 0.55 * latFrac + 0.22 * thr + 0.35 * brk + (car.slide ? 0.7 : 0) + (car.offTrack ? 0.5 : 0);
    car.wear = Math.min(1, car.wear + use * comp.wearRate * 0.0011 * dt * (1 - wet * 0.4));
    const heat = (20 * latFrac + 8 * thr + 11 * brk + (car.slide ? 26 : 0)) * (1 - wet * 0.35);
    const coolRate = 0.25 * (1 + wet * 1.6);
    car.temp += (heat - (car.temp - (env.ambient ?? 24)) * coolRate) * dt;
    car.temp = U.clamp(car.temp, 15, 140);

    // --- Gear / RPM (cosmetic) ---
    const wheelRPM = Math.abs(car.v) / (2 * Math.PI * 0.33) * 60;
    let rpm = wheelRPM * CFG.GEARS[car.gear] * CFG.FINAL;
    if (rpm > 12800 && car.gear < 8) { car.gear++; car.gearFlash = 0.1; }
    else if (rpm < 6200 && car.gear > 1) car.gear--;
    rpm = wheelRPM * CFG.GEARS[car.gear] * CFG.FINAL;
    car.rpm = U.clamp(rpm, 5000, 15000);
    if (car.gearFlash > 0) car.gearFlash -= dt;

    // --- Stuck / far-off auto reset ---
    if (car.ghostT > 0) car.ghostT -= dt;
    const wantsMove = thr > 0.3 || !car.isPlayer;
    car.stuckT = (Math.abs(car.v) < 3 && wantsMove) ? car.stuckT + dt : 0;
    if (inp.reset || car.stuckT > 3.5 || Math.abs(car.lat) > halfW + 20) {
        const sp = cir.at(car.idx >= 0 ? car.idx : 0);
        const side = (car.id % 2 === 0 ? 1 : -1) * Math.min(2.5, halfW - 1.5);
        car.x = sp.x + sp.nx * side; car.y = sp.y + sp.ny * side;
        car.heading = sp.ang; car.v = 10; car.steerS = 0;
        car.stuckT = 0; car.lat = side; car.wear = Math.min(1, car.wear + 0.02);
        car.justReset = true; car.resetFlash = 1.2; car.ghostT = 1.6;
    }
    if (car.resetFlash > 0) car.resetFlash -= dt;

    // --- Lap / sector accounting ---
    const prevLaps = car.lapsDone;
    car.lapsDone = Math.floor(car.cumDist / cir.length);
    car.currentLap = U.clamp(car.lapsDone + 1, 1, car.totalLaps);
    if (car.lapsDone > prevLaps && car.lapsDone >= 1) {
        car.lastLap = env.raceTime - car.lapStartT;
        if (car.lastLap < car.bestLap) car.bestLap = car.lastLap;
        car.lapStartT = env.raceTime;
        car.justLapped = true;
        if (car.lapsDone >= car.totalLaps) { car.finished = true; car.finishTime = env.raceTime; }
    }
    const sec = cir.sectorOf(car.arc);
    if (sec !== car.sector) {
        const sIdx = car.sector - 1;
        car.sectors[sIdx] = env.raceTime - car.sectorStartT;
        if (car.sectors[sIdx] < car.bestSectors[sIdx]) car.bestSectors[sIdx] = car.sectors[sIdx];
        car.sectorStartT = env.raceTime;
        car.sector = sec;
    }
}

function moveCar(car, cir, dt) {
    car.x += Math.cos(car.heading) * car.v * dt;
    car.y += Math.sin(car.heading) * car.v * dt;
    const idx = cir.nearest(car.x, car.y, car.idx);
    const sp = cir.at(idx);
    car.lat = (car.x - sp.x) * sp.nx + (car.y - sp.y) * sp.ny;
    const newArc = idx * cir.ds;
    if (car.idx >= 0) {
        const d = U.wrapDelta(newArc - car.arc, cir.length);
        if (Math.abs(d) < 60) car.cumDist += d;
    }
    car.idx = idx; car.arc = newArc;
}

/* ============================== AI ============================== */
class AIBrain {
    constructor(car, cir, diffMult, rng) {
        this.car = car; this.cir = cir; this.rng = rng || Math.random;
        this.base = diffMult * (0.962 + car.skill * 0.038);
        this.lane = 0; this.lapNoise = 1; this.noiseLap = -1;
        this.aBr = 26;
    }

    compute(cars, env, dt) {
        const c = this.car, cir = this.cir;
        if (c.finished) return { throttle: 0, brake: 0.4, steer: 0 };
        if (c.idx < 0) return { throttle: 0.5, brake: 0, steer: 0 };

        // per-lap pace noise (consistency)
        if (c.lapsDone !== this.noiseLap) {
            this.noiseLap = c.lapsDone;
            this.lapNoise = 1 - (1 - c.consistency) * 0.05 * this.rng();
        }
        const mult = this.base * this.lapNoise;
        const gripR = U.clamp(c.gripRatio / (c.offTrack ? 0.42 : 1), 0.3, 1.2);
        const gripV = Math.sqrt(gripR);

        // --- find blocker directly ahead ---
        let blocker = null, blockGap = 35;
        for (const o of cars) {
            if (o === c || o.finished || o.pitStopActive) continue;
            const gap = U.wrapDelta(o.arc - c.arc, cir.length);
            if (gap > 0.5 && gap < blockGap && Math.abs(o.lat - c.lat) < 3.4) { blocker = o; blockGap = gap; }
        }

        // --- lane target (overtake / racing line) ---
        const sHere = cir.at(c.idx);
        const maxLane = Math.max(1.2, sHere.w / 2 - 2.4);
        let desired = 0;
        if (blocker && c.v > blocker.v - 1 && blockGap < 26) {
            desired = (blocker.lat <= 0 ? 1 : -1) * Math.min(maxLane, 4.2);
        }
        this.lane += (desired - this.lane) * Math.min(1, dt * 1.6);
        this.lane = U.clamp(this.lane, -maxLane, maxLane);

        // --- steering to lookahead point ---
        const ahead = 9 + c.v * 0.55;
        const ti = c.idx + Math.max(2, Math.round(ahead / cir.ds));
        const ts = cir.at(ti);
        const tx = ts.x + ts.nx * this.lane, ty = ts.y + ts.ny * this.lane;
        const angTo = Math.atan2(ty - c.y, tx - c.x);
        const steer = U.clamp(U.wrapAng(angTo - c.heading) * 2.4, -1, 1);

        // --- target speed: braking-distance scan ---
        const aBr = this.aBr * gripR;
        const horizon = (c.v * c.v) / (2 * aBr) + 50;
        const steps = Math.min(cir.N - 2, Math.ceil(horizon / cir.ds));
        let vt = cir.at(c.idx).vc * gripV;
        for (let j = 2; j <= steps; j += 2) {
            const d = j * cir.ds;
            const vcEff = cir.at(c.idx + j).vc * gripV;
            const allowed = Math.sqrt(vcEff * vcEff + 2 * aBr * d);
            if (allowed < vt) vt = allowed;
        }
        vt *= mult;

        // --- traffic follow if can't pass yet: keep a real gap, never push ---
        if (blocker && blockGap < 16 && Math.abs(this.lane - blocker.lat) < 2.6) {
            const followV = blockGap < 9 ? blocker.v - 1.4 : blocker.v + (blockGap - 9) * 1.2;
            vt = Math.min(vt, Math.max(followV, 4));
        }

        // --- slow to pit-entry speed on the approach, or the stop never triggers ---
        if (c.pitRequest) {
            const toPit = U.wrapDelta(cir.pitArc - c.arc, cir.length);
            if (toPit > -30 && toPit < 320) vt = Math.min(vt, 36);
        }

        let throttle = 0, brake = 0;
        if (c.v < vt - 0.4) throttle = U.clamp((vt - c.v) / 7, 0.25, 1);
        else if (c.v > vt + 0.6) brake = U.clamp((c.v - vt) / 11, 0.25, 1);
        else throttle = U.clamp((vt - c.v + 0.4) / 2.2, 0, 0.5);

        // --- systems ---
        const straight = cir.at(c.idx + 8).vc > 85 && cir.at(c.idx + 16).vc > 85;
        const ers = straight && c.ers > CFG.ERS_MAX * 0.18 && throttle > 0.6;
        const drs = c.drsAvailable;

        // --- pit decision (not on lap 1, and not within 45s of the last stop) ---
        if (!c.pitRequest && c.lapsDone >= 1 && c.totalLaps - c.lapsDone > 1 &&
            env.raceTime - (c.lastPitT ?? -999) > 45) {
            const wrongTyre = (env.wetness > 0.55 && c.compound !== 'WET') ||
                              (env.wetness > 0.22 && env.wetness <= 0.55 && c.compound !== 'INTER' && c.compound !== 'WET') ||
                              (env.wetness < 0.12 && (c.compound === 'WET' || c.compound === 'INTER'));
            if (c.wear > 0.72 || wrongTyre) c.pitRequest = true;
        }

        return { throttle, brake, steer, drs, ers };
    }
}

/* ============================== WEATHER ============================== */
class Weather {
    constructor(key, rng) {
        this.key = key; this.rng = rng || Math.random;
        this.def = CFG.WEATHERS[key] || CFG.WEATHERS.DRY;
        this.wetness = this.def.dynamic ? 0 : this.def.target;
        this.target = this.def.target;
        this.timer = this.def.dynamic ? 30 + this.rng() * 40 : Infinity;
        this.changed = false;
    }
    update(dt) {
        this.changed = false;
        if (this.def.dynamic) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.target = this.target < 0.2 ? 0.35 + this.rng() * 0.5 : 0;
                this.timer = 45 + this.rng() * 60;
                this.changed = true;
            }
        }
        // Per-second rates: rain builds over ~1.5 min, dries over ~3 min
        const rate = (this.wetness < this.target ? 0.012 : 0.006) * dt;
        this.wetness += U.clamp(this.target - this.wetness, -rate, rate);
        this.wetness = U.clamp(this.wetness, 0, 1);
    }
    grip() { return 1 - 0.38 * this.wetness; }
    label() {
        if (this.wetness > 0.6) return 'Heavy Rain';
        if (this.wetness > 0.15) return 'Rain';
        if (this.target > this.wetness + 0.1) return 'Rain Coming';
        return 'Dry';
    }
}

/* ============================== RACE SESSION (headless core) ============================== */
class RaceSession {
    constructor(opts) {
        this.cir = new Circuit(TRACK_DATA[opts.trackKey]);
        this.trackKey = opts.trackKey;
        this.totalLaps = opts.laps || 5;
        this.weather = new Weather(opts.weather || 'DRY', opts.rng);
        this.rng = opts.rng || Math.random;
        this.difficulty = CFG.DIFFICULTY[opts.difficulty || 'MEDIUM'] || CFG.DIFFICULTY.MEDIUM;
        this.state = 'countdown';
        this.countdown = 3.6;
        this.raceTime = 0;
        this.events = [];
        this.fastestLap = { time: Infinity, name: '' };
        this.graceT = 0;

        // Build field: players use chosen teams; AI fills remaining drivers
        const players = opts.players || [];
        const usedDrivers = new Set();
        this.cars = [];
        this.brains = new Map();
        const fuel = Math.min(110, this.totalLaps * 2.7 + 6);
        const startCompound = this.weather.wetness > 0.55 ? 'WET' : this.weather.wetness > 0.18 ? 'INTER' : 'MEDIUM';

        players.forEach((p, i) => {
            const team = CFG.TEAMS[p.teamIdx ?? 0];
            const dName = team.drivers[i % 2];
            usedDrivers.add(dName);
            const dCfg = CFG.DRIVERS.find(d => d.name === dName) || { num: 99, skill: 0.9, consistency: 0.9 };
            this.cars.push(createCar({
                id: i, name: p.name || dName, num: dCfg.num, team,
                isPlayer: true, playerIndex: i, totalLaps: this.totalLaps,
                compound: startCompound, fuel
            }));
        });

        const aiCount = Math.min(opts.aiCount ?? 19, 20 - players.length);
        let added = 0;
        for (const d of CFG.DRIVERS) {
            if (added >= aiCount) break;
            if (usedDrivers.has(d.name)) continue;
            const dry = ['SOFT', 'MEDIUM', 'MEDIUM', 'HARD'][Math.floor(this.rng() * 4)];
            const car = createCar({
                id: players.length + added, name: d.name, num: d.num, team: CFG.TEAMS[d.team],
                skill: d.skill, consistency: d.consistency, totalLaps: this.totalLaps,
                compound: this.weather.wetness > 0.18 ? startCompound : dry, fuel
            });
            this.cars.push(car);
            this.brains.set(car.id, new AIBrain(car, this.cir, this.difficulty, this.rng));
            added++;
        }

        // Grid: qualifying-ish order — players in midfield-front, AI by skill
        const gridOrder = [...this.cars].sort((a, b) => {
            const sa = a.isPlayer ? 0.93 : a.skill;
            const sb = b.isPlayer ? 0.93 : b.skill;
            return sb - sa;
        });
        gridOrder.forEach((car, i) => {
            const arc = this.cir.length - 12 - i * 7.5;
            const gi = Math.round(arc / this.cir.ds);
            const sp = this.cir.at(gi);
            const side = (i % 2 === 0 ? -1 : 1) * 3.0;
            car.x = sp.x + sp.nx * side;
            car.y = sp.y + sp.ny * side;
            car.heading = sp.ang;
            car.idx = ((gi % this.cir.N) + this.cir.N) % this.cir.N;
            car.arc = car.idx * this.cir.ds;
            car.cumDist = car.arc - this.cir.length;   // negative: behind the line
            car.lapsDone = Math.floor(car.cumDist / this.cir.length); // -1
            car.pos = i + 1;
        });
    }

    msg(text, color) { this.events.push({ text, color: color || '#ffffff' }); }

    step(dt, playerInputs) {
        playerInputs = playerInputs || [];
        this.weather.update(dt);
        if (this.weather.changed) this.msg(this.weather.target > 0.2 ? 'RAIN INCOMING!' : 'RAIN CLEARING', '#66aaff');

        if (this.state === 'countdown') {
            this.countdown -= dt;
            if (this.countdown <= 0) { this.state = 'racing'; this.msg('LIGHTS OUT — GO GO GO!', '#00ff66'); }
            return;
        }
        if (this.state === 'finished') return;

        this.raceTime += dt;
        const env = { wetness: this.weather.wetness, ambient: 24 - this.weather.wetness * 8, raceTime: this.raceTime };

        // DRS availability & gaps (arc-based)
        for (const c of this.cars) {
            let gapM = Infinity;
            for (const o of this.cars) {
                if (o === c || o.finished) continue;
                const g = U.wrapDelta(o.arc - c.arc, this.cir.length);
                const gg = g < 0 ? g + this.cir.length : g;
                if (gg > 0.5 && gg < gapM) gapM = gg;
            }
            c.gapAheadSec = gapM / Math.max(c.v, 22);
            c.drsAvailable = this.cir.inDRS(c.arc) && c.lapsDone >= 1 && c.gapAheadSec < 1.4 && this.weather.wetness < 0.25;
        }

        // Step all cars
        for (const c of this.cars) {
            let inp;
            if (c.isPlayer) inp = playerInputs[c.playerIndex] || {};
            else inp = this.brains.get(c.id).compute(this.cars, env, dt);
            stepCar(c, inp, this.cir, env, dt);

            if (c.justLapped) {
                if (c.lastLap < this.fastestLap.time && c.lapsDone >= 1) {
                    this.fastestLap = { time: c.lastLap, name: c.name };
                    if (this.raceTime > 60) this.msg(`FASTEST LAP — ${c.name} ${U.fmtTime(c.lastLap)}`, '#cc44ff');
                }
                if (c.isPlayer) {
                    if (c.finished) this.msg(`CHEQUERED FLAG! You finished P${c.pos}`, '#00ff66');
                    else this.msg(`LAP ${c.lapsDone} — ${U.fmtTime(c.lastLap)}${c.lastLap <= c.bestLap ? '  (BEST)' : ''}`,
                                  c.lastLap <= c.bestLap ? '#cc44ff' : '#ffffff');
                } else if (c.finished && c.pos <= 3) {
                    this.msg(`${c.name} finishes P${c.pos}`, '#ffcc00');
                }
            }
            if (c.justPitted && c.isPlayer) this.msg(`PIT COMPLETE — ${CFG.COMPOUNDS[c.compound].name} tyres`, '#00ff88');
            if (c.justReset && c.isPlayer) this.msg('CAR RESET TO TRACK', '#ffaa00');

            // Pit entry
            if (c.pitRequest && !c.pitStopActive && !c.finished) {
                const dToPit = Math.abs(U.wrapDelta(c.arc - this.cir.pitArc, this.cir.length));
                if (dToPit < 25 && c.v < 45) {
                    const pending = this._chooseCompound(c);
                    if (pending === c.compound && c.wear < 0.45 && !c.isPlayer) {
                        c.pitRequest = false;   // conditions changed — stop is pointless now
                    } else {
                        c.pitStopActive = true;
                        c.pitTimer = 2.3 + this.rng() * 1.2;
                        c.v = 0;
                        c.pendingCompound = pending;
                        if (c.isPlayer) this.msg('IN THE PIT BOX...', '#ffaa00');
                    }
                }
            }
        }

        // Collisions (simple circles)
        const n = this.cars.length;
        for (let i = 0; i < n; i++) {
            const a = this.cars[i];
            if (a.pitStopActive || a.finished) continue;
            for (let j = i + 1; j < n; j++) {
                const b = this.cars[j];
                if (b.pitStopActive || b.finished) continue;
                const dx = b.x - a.x, dy = b.y - a.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 19.4 && d2 > 0.001 && !(a.ghostT > 0) && !(b.ghostT > 0)) {
                    const d = Math.sqrt(d2), overlap = (4.4 - d) / 2;
                    const ux = dx / d, uy = dy / d;
                    a.x -= ux * overlap; a.y -= uy * overlap;
                    b.x += ux * overlap; b.y += uy * overlap;
                    // Damp only the chasing car, so the front car can always drive clear
                    const rear = U.wrapDelta(b.arc - a.arc, this.cir.length) > 0 ? a : b;
                    rear.v *= 0.94;
                    a.contact = b.contact = 0.3;
                }
            }
        }

        // Positions & finish handling
        const order = [...this.cars].sort((x, y) => {
            if (x.finished && y.finished) return x.finishTime - y.finishTime;
            if (x.finished) return -1;
            if (y.finished) return 1;
            return y.cumDist - x.cumDist;
        });
        order.forEach((c, i) => { c.pos = i + 1; c.gapLeaderM = order[0].cumDist - c.cumDist; });

        const playersDone = this.cars.filter(c => c.isPlayer).every(c => c.finished);
        const anyPlayers = this.cars.some(c => c.isPlayer);
        const allDone = this.cars.every(c => c.finished);
        if ((anyPlayers && playersDone) || allDone) {
            this.graceT += dt;
            if (this.graceT > (allDone ? 0.5 : 4)) this._finish(order);
        }
    }

    _chooseCompound(c) {
        const w = this.weather.wetness;
        if (w > 0.55) return 'WET';
        if (w > 0.18) return 'INTER';
        const remaining = this.totalLaps - c.lapsDone;
        if (remaining <= 7) return 'SOFT';
        if (remaining <= 14) return 'MEDIUM';
        return 'HARD';
    }

    _finish(order) {
        this.state = 'finished';
        this.results = order.map((c, i) => ({
            pos: i + 1, name: c.name, team: c.short, c1: c.c1,
            isPlayer: c.isPlayer,
            time: c.finished ? c.finishTime : this.raceTime,
            bestLap: c.bestLap, pits: c.pitCount,
            points: (CFG.POINTS[i] || 0) + (this.fastestLap.name === c.name && i < 10 ? 1 : 0),
            fastestLap: this.fastestLap.name === c.name
        }));
    }
}

/* Export headless API for tests */
if (typeof globalThis !== 'undefined') {
    globalThis.F1 = { CFG, U, Circuit, createCar, stepCar, AIBrain, Weather, RaceSession };
}

/* ============================================================
   BROWSER-ONLY LAYER (guarded — safe to load headless)
   ============================================================ */
if (typeof document !== 'undefined' && typeof window !== 'undefined') {

/* ============================== RENDERER ============================== */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = canvas.width; this.H = canvas.height;
        this.camX = 0; this.camY = 0; this.zoom = 2.4;
        this.tex = null; this.texInfo = null;
        this.miniTex = null; this.miniInfo = null;
        this.particles = [];
        this.rain = [];
    }

    buildTrack(cir, def) {
        const m = 55;
        const b = cir.bounds;
        const w = b.maxX - b.minX + 2 * m, h = b.maxY - b.minY + 2 * m;
        const t = Math.min(2.0, 2300 / Math.max(w, h));
        const cv = document.createElement('canvas');
        cv.width = Math.ceil(w * t); cv.height = Math.ceil(h * t);
        const c = cv.getContext('2d');
        const X = x => (x - b.minX + m) * t, Y = y => (y - b.minY + m) * t;

        // Grass
        c.fillStyle = def.grass || '#20301c';
        c.fillRect(0, 0, cv.width, cv.height);
        // subtle mow stripes
        c.fillStyle = 'rgba(255,255,255,0.02)';
        for (let i = 0; i < cv.width; i += 80 * t) c.fillRect(i, 0, 40 * t, cv.height);

        const seg = (i, off, width, color) => {
            const a = cir.at(i), d = cir.at(i + 1);
            c.strokeStyle = color; c.lineWidth = width * t; c.lineCap = 'round';
            c.beginPath();
            c.moveTo(X(a.x + a.nx * off), Y(a.y + a.ny * off));
            c.lineTo(X(d.x + d.nx * off), Y(d.y + d.ny * off));
            c.stroke();
        };

        // Runoff
        for (let i = 0; i < cir.N; i++) seg(i, 0, cir.at(i).w + 13, def.runoff || '#3a3a38');
        // Asphalt
        for (let i = 0; i < cir.N; i++) seg(i, 0, cir.at(i).w, i % 16 < 8 ? '#26262a' : '#242428');
        // DRS zones tint
        for (let i = 0; i < cir.N; i++) {
            if (cir.inDRS(i * cir.ds)) seg(i, 0, cir.at(i).w, 'rgba(0,190,80,0.10)');
        }
        // Kerbs
        for (let i = 0; i < cir.N; i++) {
            const s = cir.at(i);
            if (!s.kerb) continue;
            const col = (i >> 1) % 2 === 0 ? '#cc2222' : '#eeeeee';
            seg(i, s.w / 2 + 0.8, 1.7, col);
            seg(i, -s.w / 2 - 0.8, 1.7, col);
        }
        // Edge lines
        for (let i = 0; i < cir.N; i++) {
            const s = cir.at(i);
            seg(i, s.w / 2 - 0.35, 0.4, 'rgba(255,255,255,0.75)');
            seg(i, -s.w / 2 + 0.35, 0.4, 'rgba(255,255,255,0.75)');
        }
        // Start/finish checkers
        const sf = cir.at(0);
        const rows = 3, cols = Math.floor(sf.w / 1.4);
        for (let r = 0; r < rows; r++) {
            for (let q = 0; q < cols; q++) {
                const lat = -sf.w / 2 + (q + 0.5) * (sf.w / cols);
                const lon = (r - 1) * 1.4;
                c.fillStyle = (r + q) % 2 === 0 ? '#ffffff' : '#111111';
                const px = sf.x + sf.tx * lon + sf.nx * lat, py = sf.y + sf.ty * lon + sf.ny * lat;
                c.save();
                c.translate(X(px), Y(py));
                c.rotate(sf.ang);
                c.fillRect(-0.7 * t, -0.7 * t, 1.4 * t, 1.4 * t);
                c.restore();
            }
        }
        this.tex = cv;
        this.texInfo = { x: b.minX - m, y: b.minY - m, w, h };

        // Mini-map
        const mw = 170, mh = 140;
        const mt = Math.min((mw - 16) / (b.maxX - b.minX), (mh - 16) / (b.maxY - b.minY));
        const mc = document.createElement('canvas');
        mc.width = mw; mc.height = mh;
        const g = mc.getContext('2d');
        g.strokeStyle = '#555'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath();
        for (let i = 0; i <= cir.N; i += 2) {
            const s = cir.at(i);
            const px = (s.x - b.minX) * mt + 8, py = (s.y - b.minY) * mt + 8;
            i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.closePath(); g.stroke();
        g.strokeStyle = '#999'; g.lineWidth = 1.5; g.stroke();
        this.miniTex = mc;
        this.miniInfo = { mt, ox: 8, oy: 8, bx: b.minX, by: b.minY, w: mw, h: mh };
    }

    follow(cars, dt) {
        let tx, ty, tz;
        if (cars.length >= 2) {
            const a = cars[0], b = cars[1];
            tx = (a.x + b.x) / 2; ty = (a.y + b.y) / 2;
            const span = Math.max(Math.hypot(b.x - a.x, b.y - a.y), 40);
            tz = U.clamp(Math.min(this.W, this.H) / (span + 90), 1.0, 2.9);
        } else {
            const c = cars[0];
            const look = 14 + c.v * 0.42;
            tx = c.x + Math.cos(c.heading) * look;
            ty = c.y + Math.sin(c.heading) * look;
            tz = U.clamp(3.1 - c.v * 0.019, 1.55, 3.1);
        }
        const k = Math.min(1, dt * 4.5);
        this.camX += (tx - this.camX) * k;
        this.camY += (ty - this.camY) * k;
        this.zoom += (tz - this.zoom) * Math.min(1, dt * 2.2);
    }

    frame(session, playersCars, wetness) {
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#0c0e10';
        ctx.fillRect(0, 0, this.W, this.H);

        const z = this.zoom;
        ctx.setTransform(z, 0, 0, z, this.W / 2 - this.camX * z, this.H / 2 - this.camY * z);

        // Track
        if (this.tex) {
            ctx.drawImage(this.tex, this.texInfo.x, this.texInfo.y, this.texInfo.w, this.texInfo.h);
        }
        // Wet sheen
        if (wetness > 0.02) {
            ctx.fillStyle = `rgba(90,120,190,${wetness * 0.12})`;
            ctx.fillRect(this.camX - this.W / z, this.camY - this.H / z, this.W * 2 / z, this.H * 2 / z);
        }

        // Particles (world space)
        this.updateAndDrawParticles(ctx);

        // Cars (draw far→near relative to player for overlap ordering)
        const pc = playersCars[0];
        const sorted = [...session.cars].sort((a, b) =>
            U.dist2(b.x, b.y, pc.x, pc.y) - U.dist2(a.x, a.y, pc.x, pc.y));
        for (const c of sorted) this.drawCar(ctx, c, z);

        // Screen space
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (wetness > 0.05) this.drawRain(ctx, wetness);
    }

    drawCar(ctx, c, zoom) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.heading);

        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0.25, 0.3, 3.0, 1.35, 0, 0, 6.29); ctx.fill();

        // player ring
        if (c.isPlayer) {
            ctx.strokeStyle = c.playerIndex === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(80,180,255,0.85)';
            ctx.lineWidth = 0.35;
            ctx.beginPath(); ctx.arc(0, 0, 4.1, 0, 6.29); ctx.stroke();
        }
        // ERS glow
        if (c.ersDeploying) {
            ctx.strokeStyle = 'rgba(0,160,255,0.55)';
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.ellipse(-0.3, 0, 3.4, 1.6, 0, 0, 6.29); ctx.stroke();
        }

        // wheels
        const steer = c.steerS * 0.35;
        const wheel = (x, y, rot) => {
            ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
            ctx.fillStyle = '#0c0c0c';
            ctx.fillRect(-0.55, -0.36, 1.1, 0.72);
            ctx.restore();
        };
        wheel(1.55, -1.02, steer); wheel(1.55, 1.02, steer);
        wheel(-1.65, -1.05, 0); wheel(-1.65, 1.05, 0);

        // rear wing
        ctx.fillStyle = c.drsOpen ? '#00e070' : c.c2;
        ctx.fillRect(-2.65, -1.05, 0.5, 2.1);

        // body
        ctx.fillStyle = c.c1;
        ctx.beginPath();
        ctx.moveTo(-2.35, -0.75);
        ctx.lineTo(0.3, -0.72);
        ctx.lineTo(2.55, -0.24);
        ctx.lineTo(2.55, 0.24);
        ctx.lineTo(0.3, 0.72);
        ctx.lineTo(-2.35, 0.75);
        ctx.closePath();
        ctx.fill();
        // sidepod accent
        ctx.fillStyle = c.c2;
        ctx.fillRect(-1.5, -0.78, 1.5, 0.24);
        ctx.fillRect(-1.5, 0.54, 1.5, 0.24);
        // front wing
        ctx.fillStyle = c.c2;
        ctx.fillRect(2.35, -1.05, 0.35, 2.1);
        // cockpit + halo
        ctx.fillStyle = '#101014';
        ctx.beginPath(); ctx.ellipse(-0.3, 0, 0.72, 0.4, 0, 0, 6.29); ctx.fill();
        ctx.strokeStyle = 'rgba(200,200,210,0.9)'; ctx.lineWidth = 0.13;
        ctx.beginPath(); ctx.ellipse(-0.3, 0, 0.85, 0.5, 0, 0, 6.29); ctx.stroke();

        ctx.restore();

        // name tag
        if (!c.isPlayer && zoom > 1.7) {
            ctx.save();
            ctx.translate(c.x, c.y - 4.6);
            ctx.scale(1 / zoom, 1 / zoom);
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.fillText(c.name.slice(0, 3).toUpperCase(), 0, 0);
            ctx.restore();
        }

        // emit particles
        if (c.slide && c.v > 10) this.emit(c, 'smoke', 2);
        if (c.offTrack && c.v > 8) this.emit(c, 'dust', 2);
        if (c.onKerb && c.v > 30) this.emit(c, 'spark', 1);
        if (c.contact > 0) { this.emit(c, 'spark', 3); c.contact -= 0.05; }
    }

    emit(c, type, count) {
        if (this.particles.length > 500) return;
        for (let i = 0; i < count; i++) {
            const bx = c.x - Math.cos(c.heading) * 2 + (Math.random() - 0.5) * 1.6;
            const by = c.y - Math.sin(c.heading) * 2 + (Math.random() - 0.5) * 1.6;
            this.particles.push({
                type, x: bx, y: by,
                vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
                life: type === 'spark' ? 0.3 : 0.9, max: type === 'spark' ? 0.3 : 0.9,
                r: type === 'smoke' ? 0.9 : 0.35
            });
        }
    }

    updateAndDrawParticles(ctx) {
        const dt = 1 / 60;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.type === 'smoke') p.r += 2.2 * dt;
            const a = p.life / p.max;
            ctx.globalAlpha = a * (p.type === 'smoke' ? 0.35 : 0.9);
            ctx.fillStyle = p.type === 'smoke' ? '#cfcfcf' : p.type === 'dust' ? '#9a814d' : '#ffcc44';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.29); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawRain(ctx, wetness) {
        const count = Math.floor(wetness * 130);
        while (this.rain.length < count) this.rain.push({ x: Math.random() * this.W, y: Math.random() * this.H, s: 8 + Math.random() * 10 });
        this.rain.length = count;
        ctx.strokeStyle = 'rgba(170,200,255,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of this.rain) {
            d.y += d.s; d.x += 1.5;
            if (d.y > this.H) { d.y = -10; d.x = Math.random() * this.W; }
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 2, d.y - d.s);
        }
        ctx.stroke();
    }
}

/* ============================== HUD ============================== */
class HUD {
    constructor(ctx, W, H) {
        this.ctx = ctx; this.W = W; this.H = H;
        this.messages = [];
    }
    addMessage(text, color) {
        this.messages.unshift({ text, color, life: 3.5 });
        if (this.messages.length > 4) this.messages.pop();
    }

    draw(session, player, renderer, dt) {
        const ctx = this.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.textBaseline = 'middle';

        this.topBar(session, player);
        this.speedo(player);
        this.tyres(player);
        this.bars(player);
        this.drsBox(player);
        this.tower(session, player);
        this.miniMap(session, renderer);
        this.weatherChip(session);
        this.msgs(dt);
        if (session.state === 'countdown') this.lights(session);
        if (player.pitRequest && !player.pitStopActive) {
            this.centerNote('PIT REQUESTED — box at the start/finish straight', '#ffaa00', this.H - 150);
        }
        if (player.pitStopActive) {
            this.centerNote(`PIT STOP  ${Math.max(0, player.pitTimer).toFixed(1)}s`, '#ffcc00', this.H / 2 - 90);
        }
    }

    panel(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(8,10,14,0.78)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r || 8);
        ctx.fill();
    }

    topBar(session, p) {
        const ctx = this.ctx;
        this.panel(0, 0, this.W, 46, 0);
        ctx.fillStyle = '#e10600';
        ctx.fillRect(0, 0, 64, 46);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 26px Arial Black';
        ctx.textAlign = 'center';
        ctx.fillText('P' + p.pos, 32, 24);

        ctx.textAlign = 'left';
        ctx.font = 'bold 15px Arial';
        ctx.fillText(`LAP ${Math.min(p.currentLap, p.totalLaps)}/${p.totalLaps}`, 76, 15);
        ctx.fillStyle = '#8a8f98';
        ctx.font = '12px Arial';
        ctx.fillText(session.cir.shortName.toUpperCase() + '  ·  ' + U.fmtTime(session.raceTime), 76, 33);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Consolas, monospace';
        ctx.fillText(U.fmtTime(session.raceTime - p.lapStartT), this.W / 2, 15);
        ctx.font = '11px Consolas, monospace';
        ctx.fillStyle = '#9aa';
        ctx.fillText('LAST ' + U.fmtTime(p.lastLap), this.W / 2 - 80, 34);
        ctx.fillStyle = '#c66bff';
        ctx.fillText('BEST ' + U.fmtTime(p.bestLap), this.W / 2 + 80, 34);

        ctx.textAlign = 'right';
        ctx.font = '12px Consolas, monospace';
        ctx.fillStyle = '#8f8';
        const gap = p.pos > 1 ? p.gapLeaderM / Math.max(p.v, 25) : 0;
        ctx.fillText(p.pos > 1 ? `LEADER +${gap.toFixed(1)}s` : 'LEADER', this.W - 12, 15);
        ctx.fillStyle = '#889';
        ctx.fillText(session.fastestLap.time < Infinity ? `FL ${session.fastestLap.name} ${U.fmtTime(session.fastestLap.time)}` : '', this.W - 12, 33);
    }

    speedo(p) {
        const ctx = this.ctx;
        const cx = this.W / 2, y = this.H - 12;
        this.panel(cx - 150, y - 78, 300, 84, 10);

        // RPM strip
        const frac = (p.rpm - 5000) / 10000;
        ctx.fillStyle = '#15171c';
        ctx.fillRect(cx - 138, y - 70, 276, 8);
        ctx.fillStyle = frac > 0.83 ? '#ff2200' : frac > 0.65 ? '#ffaa00' : '#00aaff';
        ctx.fillRect(cx - 138, y - 70, 276 * U.clamp(frac, 0, 1), 8);
        for (let i = 1; i < 8; i++) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(cx - 138 + i * 34.5, y - 70, 1.5, 8);
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = p.gearFlash > 0 ? '#ffdd00' : '#e10600';
        ctx.font = 'bold 40px Arial Black';
        ctx.fillText(p.v < -0.2 ? 'R' : p.gear, cx - 95, y - 32);
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText('GEAR', cx - 95, y - 8);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 38px Consolas, monospace';
        ctx.fillText(Math.round(Math.abs(p.v) * 3.6), cx + 15, y - 32);
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.fillText('KM/H', cx + 15, y - 8);

        // ERS deploy indicator
        if (p.ersDeploying) {
            ctx.fillStyle = '#00aaff';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('ERS', cx + 110, y - 40);
        }
    }

    tyres(p) {
        const ctx = this.ctx;
        const x = 12, y = 60;
        this.panel(x, y, 108, 118, 8);
        const comp = CFG.COMPOUNDS[p.compound];
        ctx.textAlign = 'center';
        ctx.fillStyle = comp.color;
        ctx.font = 'bold 13px Arial';
        ctx.fillText(comp.name.toUpperCase(), x + 54, y + 14);

        // tyre circle with wear ring
        const cx = x + 38, cy = y + 62;
        ctx.strokeStyle = '#222'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 6.29); ctx.stroke();
        const wearCol = p.wear < 0.4 ? '#00e055' : p.wear < 0.7 ? '#ffaa00' : '#ff3322';
        ctx.strokeStyle = wearCol;
        ctx.beginPath(); ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + (1 - p.wear) * 2 * Math.PI); ctx.stroke();
        ctx.fillStyle = comp.color;
        ctx.font = 'bold 17px Arial Black';
        ctx.fillText(comp.letter, cx, cy);

        ctx.textAlign = 'left';
        ctx.font = '11px Consolas, monospace';
        ctx.fillStyle = wearCol;
        ctx.fillText(Math.round((1 - p.wear) * 100) + '%', x + 72, y + 52);
        const tCol = Math.abs(p.temp - comp.optimal) < 20 ? '#8f8' : p.temp > comp.optimal ? '#f66' : '#6af';
        ctx.fillStyle = tCol;
        ctx.fillText(Math.round(p.temp) + '°C', x + 72, y + 70);
        ctx.fillStyle = '#889';
        ctx.fillText('P: pit', x + 10, y + 106);
    }

    bars(p) {
        const ctx = this.ctx;
        const x = this.W - 60, y = 60;
        this.panel(x, y, 48, 172, 8);
        // ERS
        ctx.fillStyle = '#15171c';
        ctx.fillRect(x + 8, y + 20, 12, 100);
        const ef = p.ers / CFG.ERS_MAX;
        ctx.fillStyle = p.ersDeploying ? '#33ccff' : '#0077cc';
        ctx.fillRect(x + 8, y + 20 + 100 * (1 - ef), 12, 100 * ef);
        // Fuel
        ctx.fillStyle = '#15171c';
        ctx.fillRect(x + 28, y + 20, 12, 100);
        const ff = U.clamp(p.fuel / 110, 0, 1);
        ctx.fillStyle = ff > 0.15 ? '#ff9900' : '#ff2200';
        ctx.fillRect(x + 28, y + 20 + 100 * (1 - ff), 12, 100 * ff);

        ctx.textAlign = 'center';
        ctx.font = '9px Arial';
        ctx.fillStyle = '#3af'; ctx.fillText('ERS', x + 14, y + 12);
        ctx.fillStyle = '#fa0'; ctx.fillText('FUEL', x + 34, y + 12);
        ctx.fillStyle = '#889';
        ctx.font = '10px Consolas, monospace';
        ctx.fillText(Math.round(ef * 100) + '', x + 14, y + 132);
        ctx.fillText(Math.round(p.fuel), x + 34, y + 132);
        ctx.fillStyle = '#667';
        ctx.font = '9px Arial';
        ctx.fillText('SHIFT', x + 24, y + 148);
        ctx.fillText('boost', x + 24, y + 160);
    }

    drsBox(p) {
        const ctx = this.ctx;
        const x = this.W - 108, y = this.H - 96;
        this.panel(x, y, 96, 34, 8);
        ctx.textAlign = 'center';
        ctx.font = 'bold 15px Arial';
        if (p.drsOpen) {
            ctx.fillStyle = '#00ff66';
            ctx.fillText('DRS OPEN', x + 48, y + 17);
        } else if (p.drsAvailable) {
            ctx.fillStyle = '#ffffff';
            ctx.fillText('DRS READY', x + 48, y + 17);
        } else {
            ctx.fillStyle = '#3a3f46';
            ctx.fillText('DRS', x + 48, y + 17);
        }
    }

    tower(session, player) {
        const ctx = this.ctx;
        const order = [...session.cars].sort((a, b) => a.pos - b.pos);
        const show = order.slice(0, 10);
        if (player.pos > 10) show.push(player);
        const x = this.W - 178, y = 56, rh = 19;
        this.panel(x, y, 166, show.length * rh + 26, 8);
        ctx.fillStyle = '#e10600';
        ctx.fillRect(x, y, 166, 20);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('POSITIONS', x + 83, y + 10);

        show.forEach((c, i) => {
            const ry = y + 24 + i * rh;
            if (c.isPlayer) {
                ctx.fillStyle = 'rgba(225,6,0,0.25)';
                ctx.fillRect(x + 2, ry - 2, 162, rh - 1);
            }
            ctx.fillStyle = c.c1;
            ctx.fillRect(x + 4, ry - 1, 3, rh - 3);
            ctx.textAlign = 'left';
            ctx.font = c.isPlayer ? 'bold 11px Consolas, monospace' : '11px Consolas, monospace';
            ctx.fillStyle = c.isPlayer ? '#fff' : '#aab';
            ctx.fillText(String(c.pos).padStart(2), x + 11, ry + 7);
            ctx.fillText(c.name.slice(0, 3).toUpperCase(), x + 32, ry + 7);
            const comp = CFG.COMPOUNDS[c.compound];
            ctx.fillStyle = comp.color;
            ctx.fillText(comp.letter, x + 66, ry + 7);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#778';
            let info;
            if (c.finished) info = 'FIN';
            else if (c.pitStopActive) info = 'PIT';
            else if (c.pos === 1) info = 'Ldr';
            else {
                const g = c.gapLeaderM / Math.max(c.v, 25);
                info = g > 90 ? '+' + Math.floor(c.gapLeaderM / session.cir.length) + 'L' : '+' + g.toFixed(1);
            }
            ctx.fillText(info, x + 160, ry + 7);
        });
    }

    miniMap(session, renderer) {
        const ctx = this.ctx;
        const mi = renderer.miniInfo;
        if (!mi) return;
        const x = 12, y = this.H - mi.h - 12;
        this.panel(x - 2, y - 2, mi.w + 4, mi.h + 4, 8);
        ctx.drawImage(renderer.miniTex, x, y);
        for (const c of session.cars) {
            ctx.fillStyle = c.isPlayer ? '#ffffff' : c.c1;
            ctx.beginPath();
            ctx.arc(x + (c.x - mi.bx) * mi.mt + mi.ox, y + (c.y - mi.by) * mi.mt + mi.oy, c.isPlayer ? 3.4 : 2.3, 0, 6.29);
            ctx.fill();
        }
    }

    weatherChip(session) {
        const ctx = this.ctx;
        const x = 130, y = 60;
        this.panel(x, y, 108, 24, 6);
        const wet = session.weather.wetness;
        ctx.textAlign = 'left';
        ctx.font = '11px Arial';
        ctx.fillStyle = wet > 0.15 ? '#66aaff' : '#ffcc44';
        ctx.fillText((wet > 0.15 ? '🌧 ' : '☀ ') + session.weather.label(), x + 8, y + 12);
    }

    msgs(dt) {
        const ctx = this.ctx;
        for (let i = this.messages.length - 1; i >= 0; i--) {
            const m = this.messages[i];
            m.life -= dt;
            if (m.life <= 0) { this.messages.splice(i, 1); continue; }
            const a = Math.min(1, m.life);
            const y = 120 + i * 34;
            ctx.globalAlpha = a;
            this.panel(this.W / 2 - 190, y - 14, 380, 28, 6);
            ctx.fillStyle = m.color;
            ctx.textAlign = 'center';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(m.text, this.W / 2, y);
            ctx.globalAlpha = 1;
        }
    }

    centerNote(text, color, y) {
        const ctx = this.ctx;
        this.panel(this.W / 2 - 210, y - 16, 420, 32, 6);
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.font = 'bold 15px Arial';
        ctx.fillText(text, this.W / 2, y);
    }

    lights(session) {
        const ctx = this.ctx;
        const t = session.countdown;
        const lit = U.clamp(Math.ceil((3.6 - t) / 0.6), 0, 5);
        for (let i = 0; i < 5; i++) {
            const x = this.W / 2 - 120 + i * 60, y = 130;
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath(); ctx.roundRect(x - 22, y - 26, 44, 78, 6); ctx.fill();
            for (let r = 0; r < 2; r++) {
                ctx.fillStyle = i < lit ? '#ff1100' : '#2a0a0a';
                if (i < lit) { ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 14; }
                ctx.beginPath(); ctx.arc(x, y + r * 36, 13, 0, 6.29); ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        if (t < 0.6) {
            ctx.fillStyle = '#00ff66';
            ctx.font = 'bold 70px Arial Black';
            ctx.textAlign = 'center';
            ctx.fillText('GO!', this.W / 2, 260);
        }
    }
}

/* ============================== AUDIO ============================== */
class AudioSys {
    constructor() { this.ok = false; this.muted = false; }
    init() {
        if (this.ok) return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AC();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.30;
            this.master.connect(this.ctx.destination);

            this.eGain = this.ctx.createGain();
            this.eGain.gain.value = 0;
            const shaper = this.ctx.createWaveShaper();
            const curve = new Float32Array(256);
            for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(2.4 * x); }
            shaper.curve = curve;
            const lp = this.ctx.createBiquadFilter();
            lp.type = 'lowpass'; lp.frequency.value = 2600;
            this.eGain.connect(shaper); shaper.connect(lp); lp.connect(this.master);

            this.oscs = [];
            [[1, 'sawtooth', 0.5], [2, 'square', 0.22], [3, 'sawtooth', 0.12], [4.5, 'square', 0.06]].forEach(([mult, type, g]) => {
                const o = this.ctx.createOscillator();
                o.type = type; o.frequency.value = 70 * mult;
                const og = this.ctx.createGain(); og.gain.value = g;
                o.connect(og); og.connect(this.eGain);
                o.start();
                this.oscs.push({ o, mult });
            });

            // tyre squeal
            this.sq = this.ctx.createOscillator();
            this.sq.type = 'sine'; this.sq.frequency.value = 900;
            this.sqGain = this.ctx.createGain(); this.sqGain.gain.value = 0;
            this.sq.connect(this.sqGain); this.sqGain.connect(this.master);
            this.sq.start();

            this.ok = true;
        } catch (e) { /* audio unavailable */ }
    }
    resume() { if (this.ok && this.ctx.state === 'suspended') this.ctx.resume(); }
    update(p) {
        if (!this.ok || this.muted) return;
        const t = this.ctx.currentTime;
        const rf = (p.rpm - 5000) / 10000;
        const f = 60 + rf * 170;
        for (const { o, mult } of this.oscs) o.frequency.setTargetAtTime(f * mult, t, 0.04);
        const vol = 0.05 + rf * 0.3 + p.throttle * 0.28;
        this.eGain.gain.setTargetAtTime(vol, t, 0.05);
        this.sqGain.gain.setTargetAtTime(p.slide && Math.abs(p.v) > 10 ? 0.05 : 0, t, 0.05);
        this.sq.frequency.setTargetAtTime(700 + Math.abs(p.v) * 4, t, 0.1);
    }
    toggleMute() {
        this.muted = !this.muted;
        if (this.ok) this.master.gain.value = this.muted ? 0 : 0.30;
        return this.muted;
    }
    thud() {
        if (!this.ok || this.muted) return;
        const t = this.ctx.currentTime;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(160, t);
        o.frequency.exponentialRampToValueAtTime(35, t + 0.25);
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + 0.3);
    }
}

/* ============================== MENU ============================== */
class Menu {
    constructor(game) {
        this.game = game;
        this.el = document.getElementById('menu');
        this.sel = { track: 'monaco', team: 0, laps: 5, weather: 'DRY', diff: 'MEDIUM', players: 1 };
        this.champ = this.loadChamp();
        this.show('main');
    }

    loadChamp() {
        try {
            const raw = localStorage.getItem('f1champ');
            if (raw) return JSON.parse(raw);
        } catch (e) { /* no storage */ }
        return null;
    }
    saveChamp() {
        try { localStorage.setItem('f1champ', JSON.stringify(this.champ)); } catch (e) { /* no-op */ }
    }

    show(screen, data) {
        this.el.style.display = 'flex';
        if (screen === 'main') this.renderMain();
        else if (screen === 'setup') this.renderSetup();
        else if (screen === 'results') this.renderResults(data);
        else if (screen === 'champ') this.renderChamp();
    }
    hide() { this.el.style.display = 'none'; }

    renderMain() {
        this.el.innerHTML = `
        <div class="menu-logo">
            <div class="logo-f1">F1</div>
            <div class="logo-sub">RACING CHAMPIONSHIP</div>
        </div>
        <div class="menu-buttons">
            <button class="btn btn-primary" data-act="quick">QUICK RACE</button>
            <button class="btn btn-secondary" data-act="custom">CUSTOM RACE</button>
            <button class="btn btn-secondary" data-act="2p">2 PLAYER SPLIT</button>
            <button class="btn btn-secondary" data-act="champ">CHAMPIONSHIP</button>
        </div>
        <div class="menu-controls">
            <div class="ctrl-title">CONTROLS — PLAYER 1</div>
            <div class="ctrl-row"><span class="ctrl-key">W / S</span> Throttle / Brake</div>
            <div class="ctrl-row"><span class="ctrl-key">A / D</span> Steer</div>
            <div class="ctrl-row"><span class="ctrl-key">SPACE</span> DRS (when READY)</div>
            <div class="ctrl-row"><span class="ctrl-key">SHIFT</span> ERS boost</div>
            <div class="ctrl-row"><span class="ctrl-key">P</span> Pit stop &nbsp; <span class="ctrl-key">R</span> Reset car</div>
            <div class="ctrl-row"><span class="ctrl-key">ESC</span> Pause &nbsp; <span class="ctrl-key">M</span> Mute</div>
            <div class="ctrl-row" style="margin-top:6px;color:#556"><span class="ctrl-key">P2</span> Arrows + Enter + R-Shift</div>
        </div>`;
        this.el.onclick = (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            const act = b.dataset.act;
            if (act === 'quick') this.game.startRace({ trackKey: 'monaco', laps: 3, weather: 'DRY', difficulty: 'MEDIUM', players: [{ teamIdx: 2 }] });
            else if (act === 'custom') { this.sel.players = 1; this.show('setup'); }
            else if (act === '2p') { this.sel.players = 2; this.show('setup'); }
            else if (act === 'champ') this.show('champ');
        };
    }

    renderSetup() {
        const tracks = Object.entries(TRACK_DATA);
        const flags = { monaco: '🇲🇨', spa: '🇧🇪', silverstone: '🇬🇧', monza: '🇮🇹', suzuka: '🇯🇵' };
        this.el.innerHTML = `
        <div class="setup-panel">
            <h2 class="setup-title">${this.sel.players === 2 ? '2 PLAYER ' : ''}RACE SETUP</h2>
            <div class="setup-grid">
                <div class="setup-col">
                    <div class="setup-label">CIRCUIT</div>
                    <div class="track-list">
                        ${tracks.map(([k, t]) => `
                        <div class="track-item ${k === this.sel.track ? 'selected' : ''}" data-track="${k}">
                            <span class="track-flag">${flags[k]}</span> ${t.shortName}
                            <span class="team-driver">${(t.lapLength / 1000).toFixed(1)}km</span>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="setup-col">
                    <div class="setup-label">${this.sel.players === 2 ? 'P1 TEAM (P2 gets teammate car)' : 'YOUR TEAM'}</div>
                    <div class="team-list">
                        ${CFG.TEAMS.map((t, i) => `
                        <div class="team-item ${i === this.sel.team ? 'selected' : ''}" data-team="${i}" style="border-left:4px solid ${t.c1}">
                            ${t.name}<span class="team-driver">${t.drivers[0]}</span>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="setup-col">
                    <div class="setup-label">LAPS</div>
                    <div class="option-group">
                        ${[3, 5, 10, 20].map(l => `<div class="option-btn ${l === this.sel.laps ? 'selected' : ''}" data-laps="${l}">${l}</div>`).join('')}
                    </div>
                    <div class="setup-label mt">WEATHER</div>
                    <div class="option-group">
                        ${Object.entries(CFG.WEATHERS).map(([k, w]) => `<div class="option-btn ${k === this.sel.weather ? 'selected' : ''}" data-weather="${k}">${w.name}</div>`).join('')}
                    </div>
                    <div class="setup-label mt">AI DIFFICULTY</div>
                    <div class="option-group">
                        ${Object.keys(CFG.DIFFICULTY).map(d => `<div class="option-btn ${d === this.sel.diff ? 'selected' : ''}" data-diff="${d}">${d}</div>`).join('')}
                    </div>
                </div>
            </div>
            <div class="setup-actions">
                <button class="btn btn-back" data-act="back">BACK</button>
                <button class="btn btn-primary btn-large" data-act="start">START RACE</button>
            </div>
        </div>`;

        this.el.onclick = (e) => {
            const t = e.target.closest('[data-track],[data-team],[data-laps],[data-weather],[data-diff],[data-act]');
            if (!t) return;
            const d = t.dataset;
            if (d.track) { this.sel.track = d.track; this.reSelect('.track-item', t); }
            else if (d.team !== undefined) { this.sel.team = +d.team; this.reSelect('.team-item', t); }
            else if (d.laps) { this.sel.laps = +d.laps; this.reSelect('[data-laps]', t); }
            else if (d.weather) { this.sel.weather = d.weather; this.reSelect('[data-weather]', t); }
            else if (d.diff) { this.sel.diff = d.diff; this.reSelect('[data-diff]', t); }
            else if (d.act === 'back') this.show('main');
            else if (d.act === 'start') {
                const players = [{ teamIdx: this.sel.team }];
                if (this.sel.players === 2) players.push({ teamIdx: this.sel.team });
                this.game.startRace({
                    trackKey: this.sel.track, laps: this.sel.laps,
                    weather: this.sel.weather, difficulty: this.sel.diff, players
                });
            }
        };
    }

    reSelect(sel, target) {
        this.el.querySelectorAll(sel).forEach(x => x.classList.remove('selected'));
        target.classList.add('selected');
    }

    renderResults(data) {
        const { results, champRound } = data;
        const podium = results.slice(0, 3);
        this.el.innerHTML = `
        <div class="results-panel">
            <div class="results-title">RACE RESULTS</div>
            <div class="podium">
                ${podium.map((r, i) => `
                <div class="podium-step pos-${i + 1}">
                    <div class="podium-pos">P${r.pos}</div>
                    <div class="podium-name ${r.isPlayer ? 'player-result' : ''}">${r.name}</div>
                    <div class="podium-team">${r.team}</div>
                    <div class="podium-time">${U.fmtTime(r.time)}</div>
                    <div class="podium-pts">+${r.points} pts</div>
                </div>`).join('')}
            </div>
            <div class="results-table">
                ${results.map(r => `
                <div class="results-row ${r.isPlayer ? 'player-row' : ''}">
                    <span class="res-pos">P${r.pos}</span>
                    <span class="res-name">${r.name}${r.fastestLap ? ' <span style="color:#c6f">◆FL</span>' : ''}</span>
                    <span class="res-team">${r.team}</span>
                    <span class="res-time">${U.fmtTime(r.bestLap)}</span>
                    <span class="res-pts">${r.points}</span>
                </div>`).join('')}
            </div>
            <div class="results-actions">
                ${champRound ? '<button class="btn btn-primary" data-act="champNext">NEXT ROUND</button>' : '<button class="btn btn-primary" data-act="again">RACE AGAIN</button>'}
                <button class="btn btn-secondary" data-act="menu">MAIN MENU</button>
            </div>
        </div>`;
        this.el.onclick = (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            if (b.dataset.act === 'again') this.show('setup');
            else if (b.dataset.act === 'champNext') this.show('champ');
            else this.show('main');
        };
    }

    renderChamp() {
        const order = Object.keys(TRACK_DATA);
        if (!this.champ) this.champ = { round: 0, standings: {}, team: 2 };
        const c = this.champ;
        const done = c.round >= order.length;
        const next = done ? null : TRACK_DATA[order[c.round]];
        const standings = Object.entries(c.standings)
            .map(([name, v]) => ({ name, ...v }))
            .sort((a, b) => b.pts - a.pts);

        this.el.innerHTML = `
        <div class="champ-panel">
            <div class="champ-title">CHAMPIONSHIP</div>
            <div class="champ-round">${done ? 'SEASON COMPLETE' : `ROUND ${c.round + 1} / ${order.length}`}</div>
            ${done
                ? `<div class="champ-next"><div class="next-label">CHAMPION</div>
                   <div class="next-name">${standings[0] ? standings[0].name : '—'}</div>
                   <div class="next-track">${standings[0] ? standings[0].pts + ' points' : ''}</div></div>`
                : `<div class="champ-next"><div class="next-label">NEXT RACE</div>
                   <div class="next-name">${next.name}</div>
                   <div class="next-track">${next.shortName} · ${(next.lapLength / 1000).toFixed(1)} km · 5 laps</div></div>`}
            ${standings.length ? `
            <div class="champ-standings">
                <div class="standings-header">DRIVER STANDINGS</div>
                ${standings.slice(0, 10).map((s, i) => `
                <div class="standing-row" ${s.isPlayer ? 'style="color:#fff;background:#180808"' : ''}>
                    <span class="st-pos">${i + 1}</span>
                    <span class="st-name">${s.name}${s.isPlayer ? ' ★' : ''}</span>
                    <span class="st-team">${s.team}</span>
                    <span class="st-pts">${s.pts} pts</span>
                </div>`).join('')}
            </div>` : ''}
            <div class="champ-actions">
                ${done ? '<button class="btn btn-primary" data-act="reset">NEW SEASON</button>'
                       : '<button class="btn btn-primary" data-act="race">RACE</button>'}
                <button class="btn btn-secondary" data-act="menu">MAIN MENU</button>
            </div>
        </div>`;
        this.el.onclick = (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            const act = b.dataset.act;
            if (act === 'race') {
                this.game.startRace({
                    trackKey: order[c.round], laps: 5, weather: Math.random() < 0.25 ? 'CHANGING' : 'DRY',
                    difficulty: 'MEDIUM', players: [{ teamIdx: c.team }], champ: true
                });
            } else if (act === 'reset') {
                this.champ = { round: 0, standings: {}, team: 2 };
                this.saveChamp();
                this.show('champ');
            } else this.show('main');
        };
    }

    recordChampResults(results) {
        const c = this.champ || (this.champ = { round: 0, standings: {}, team: 2 });
        for (const r of results) {
            if (!c.standings[r.name]) c.standings[r.name] = { pts: 0, team: r.team, isPlayer: r.isPlayer };
            c.standings[r.name].pts += r.points;
            if (r.isPlayer) c.standings[r.name].isPlayer = true;
        }
        c.round++;
        this.saveChamp();
    }
}

/* ============================== GAME ============================== */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.canvas.width = 1280;
        this.canvas.height = 720;
        this.renderer = new Renderer(this.canvas);
        this.hud = new HUD(this.canvas.getContext('2d'), 1280, 720);
        this.audio = new AudioSys();
        this.menu = new Menu(this);

        this.session = null;
        this.paused = false;
        this.isChamp = false;
        this.keys = {};
        this.acc = 0;
        this.last = 0;

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (this.session && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Slash'].includes(e.code)) e.preventDefault();
            if (e.code === 'Escape' && this.session) this.paused = !this.paused;
            if (e.code === 'KeyM') this.audio.toggleMute();
            if (e.code === 'KeyP' && this.session) {
                const p = this.session.cars.find(c => c.isPlayer && c.playerIndex === 0);
                if (p && !p.pitRequest && !p.finished) { p.pitRequest = true; this.hud.addMessage('PIT REQUESTED', '#ffaa00'); }
            }
            if (e.code === 'Slash' && this.session) {
                const p = this.session.cars.find(c => c.isPlayer && c.playerIndex === 1);
                if (p && !p.pitRequest && !p.finished) p.pitRequest = true;
            }
            this.audio.resume();
        });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });

        requestAnimationFrame((t) => this.loop(t));
    }

    startRace(opts) {
        this.session = new RaceSession({
            trackKey: opts.trackKey, laps: opts.laps, weather: opts.weather,
            difficulty: opts.difficulty, players: opts.players, aiCount: 19
        });
        this.isChamp = !!opts.champ;
        this.renderer.buildTrack(this.session.cir, TRACK_DATA[opts.trackKey]);
        this.renderer.particles = [];
        const p0 = this.session.cars[0];
        this.renderer.camX = p0.x; this.renderer.camY = p0.y;
        this.hud.messages = [];
        this.paused = false;
        this.audio.init();
        this.menu.hide();
        this.canvas.style.display = 'block';
        this.hud.addMessage(`${this.session.cir.name} — ${opts.laps} LAPS`, '#ffffff');
    }

    playerInput(pi) {
        const k = CFG.CONTROLS[pi], K = this.keys;
        return {
            throttle: K[k.up] ? 1 : 0,
            brake: K[k.down] ? 1 : 0,
            steer: (K[k.right] ? 1 : 0) - (K[k.left] ? 1 : 0),
            drs: !!K[k.drs],
            ers: !!K[k.ers],
            reset: !!K[k.reset]
        };
    }

    loop(t) {
        requestAnimationFrame((tt) => this.loop(tt));
        const dt = Math.min((t - this.last) / 1000, 0.1);
        this.last = t;
        if (!this.session) return;

        const s = this.session;
        if (!this.paused && s.state !== 'finished') {
            this.acc += dt;
            const inputs = [this.playerInput(0), this.playerInput(1)];
            let steps = 0;
            while (this.acc >= CFG.DT && steps < 5) {
                s.step(CFG.DT, inputs);
                this.acc -= CFG.DT;
                steps++;
            }
            if (steps === 5) this.acc = 0;
        }

        // drain events → HUD
        for (const ev of s.events) this.hud.addMessage(ev.text, ev.color);
        s.events.length = 0;

        // render
        const players = s.cars.filter(c => c.isPlayer);
        this.renderer.follow(players, dt);
        this.renderer.frame(s, players, s.weather.wetness);
        this.hud.draw(s, players[0], this.renderer, dt);

        if (players.length > 1) this.p2Hud(players[1]);
        this.audio.update(players[0]);

        if (this.paused) {
            const ctx = this.canvas.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, 1280, 720);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 52px Arial Black';
            ctx.fillText('PAUSED', 640, 330);
            ctx.font = '20px Arial';
            ctx.fillStyle = '#aab';
            ctx.fillText('ESC resume · Q quit to menu', 640, 380);
            if (this.keys['KeyQ']) this.endRace(true);
        }

        if (s.state === 'finished' && !this._resultsShown) {
            this._resultsShown = true;
            setTimeout(() => this.endRace(false), 900);
        }
    }

    p2Hud(p2) {
        const ctx = this.canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(8,10,14,0.78)';
        ctx.beginPath(); ctx.roundRect(200, this.canvas.height - 60, 190, 48, 8); ctx.fill();
        ctx.fillStyle = '#4db8ff';
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`P2  ·  P${p2.pos}  ·  ${Math.round(Math.abs(p2.v) * 3.6)} km/h`, 212, this.canvas.height - 42);
        ctx.fillStyle = '#889';
        ctx.font = '11px Consolas, monospace';
        ctx.fillText(`Lap ${Math.min(p2.currentLap, p2.totalLaps)}/${p2.totalLaps}  Best ${U.fmtTime(p2.bestLap)}`, 212, this.canvas.height - 24);
    }

    endRace(aborted) {
        const s = this.session;
        this._resultsShown = false;
        let results = s.results;
        if (!results) {
            const order = [...s.cars].sort((a, b) => a.pos - b.pos);
            s._finish(order);
            results = s.results;
        }
        this.session = null;
        this.canvas.style.display = 'none';
        if (this.isChamp && !aborted) this.menu.recordChampResults(results);
        this.menu.show(aborted ? 'main' : 'results', { results, champRound: this.isChamp });
    }
}

/* ============================== BOOT ============================== */
const boot = () => {
    if (document.getElementById('gameCanvas')) new Game();
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

} /* end browser guard */
