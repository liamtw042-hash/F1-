#!/usr/bin/env node
/* Headless visual snapshot tool.
   Software-rasterizes the actual game world mesh (same geometry, lighting and
   fog as the WebGL renderer) from a chase-camera viewpoint and writes a PNG,
   so the scene can be visually inspected without a browser.
   Usage: node tools/snapshot.js <track> <outfile.png> [sampleIdx]           */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const sandbox = { console, Math, JSON, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['js/tracks.js', 'js/f1.js', 'js/gl.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
}
const { Circuit, RaceSession, CFG } = sandbox.F1;
const { heightProfile, buildWorld, buildCar } = sandbox.F1GL;
const TRACK_DATA = sandbox.TRACK_DATA;

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ---------- minimal PNG writer ---------- */
const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c;
    }
    return t;
})();
function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
}
function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
}
function savePNG(file, W, H, rgb) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
    ihdr[8] = 8; ihdr[9] = 2;   // 8-bit RGB
    const raw = Buffer.alloc(H * (W * 3 + 1));
    for (let y = 0; y < H; y++) {
        raw[y * (W * 3 + 1)] = 0;
        rgb.copy ? rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3)
                 : raw.set(rgb.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
    }
    fs.writeFileSync(file, Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
        chunk('IEND', Buffer.alloc(0))
    ]));
}

/* ---------- rasterizer (mirrors the GL shader) ---------- */
const W = 960, H = 540;
const LIGHT = (() => { const l = [0.45, 0.85, 0.30], n = Math.hypot(...l); return l.map(v => v / n); })();

function render(track, outFile, camIdx) {
    const def = TRACK_DATA[track];
    const cir = new Circuit(def);
    const Hp = heightProfile(cir, def.hills ?? 7);
    const world = buildWorld(cir, def, Hp, mulberry32(9));
    const hAt = i => Hp[((i % cir.N) + cir.N) % cir.N];

    // grid of cars from a real session for authentic placement
    const session = new RaceSession({
        trackKey: track, laps: 3, weather: 'DRY', difficulty: 'MEDIUM',
        players: [{ teamIdx: 2 }], aiCount: 19, rng: mulberry32(4)
    });
    const carMeshes = new Map();
    for (const c of session.cars) {
        if (!carMeshes.has(c.short)) carMeshes.set(c.short, buildCar(c.team));
    }

    // chase camera behind the player (same numbers as GLView)
    const player = session.cars.find(c => c.isPlayer);
    if (camIdx !== undefined) {  // reposition player-like viewpoint elsewhere on track
        const sp = cir.at(camIdx);
        player.x = sp.x; player.y = sp.y; player.heading = sp.ang; player.idx = camIdx;
    }
    const h0 = hAt(player.idx);
    const cosH = Math.cos(player.heading), sinH = Math.sin(player.heading);
    const eye = [player.x - cosH * 7.8, h0 + 2.7, player.y - sinH * 7.8];
    const tgt = [player.x + cosH * 10, h0 + 1.0, player.y + sinH * 10];

    // view basis (same as fixed M4.lookAt)
    let zx = eye[0] - tgt[0], zy = eye[1] - tgt[1], zz = eye[2] - tgt[2];
    const zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
    let xx = zz, xz = -zx;
    const xl = Math.hypot(xx, xz); xx /= xl; xz /= xl;
    const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;

    const fovY = 78 * Math.PI / 180;
    const fl = (H / 2) / Math.tan(fovY / 2);
    const NEAR = 0.3;
    const fogFar = 1150, fogC = [203, 222, 238];

    const zbuf = new Float32Array(W * H).fill(Infinity);
    const img = Buffer.alloc(W * H * 3);
    // sky gradient
    for (let y = 0; y < H; y++) {
        const t = y / H;
        const r = 0.30 + t * 0.51, g = 0.61 + t * 0.29, b = 0.91 + t * 0.06;
        for (let x = 0; x < W; x++) {
            const o = (y * W + x) * 3;
            img[o] = r * 255; img[o + 1] = g * 255; img[o + 2] = b * 255;
        }
    }

    const toView = (px, py, pz) => {
        const dx = px - eye[0], dy = py - eye[1], dz = pz - eye[2];
        return [dx * xx + dz * xz, dx * yx + dy * yy + dz * yz, dx * zx + dy * zy + dz * zz];
    };

    function drawTri(v0, v1, v2, r, g, b) {
        // near-plane clip (view z must be < -NEAR)
        let poly = [v0, v1, v2];
        const out = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i], c = poly[(i + 1) % poly.length];
            const aIn = a[2] < -NEAR, cIn = c[2] < -NEAR;
            if (aIn) out.push(a);
            if (aIn !== cIn) {
                const t = (-NEAR - a[2]) / (c[2] - a[2]);
                out.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, -NEAR - 1e-4]);
            }
        }
        if (out.length < 3) return;
        // fan triangulate the clipped polygon
        for (let k = 1; k < out.length - 1; k++) fillTri(out[0], out[k], out[k + 1], r, g, b);
    }

    function fillTri(a, c, d, r, g, b) {
        const pts = [a, c, d].map(v => {
            const s = fl / -v[2];
            return { x: W / 2 + v[0] * s, y: H / 2 - v[1] * s, z: -v[2] };
        });
        const minX = Math.max(0, Math.floor(Math.min(pts[0].x, pts[1].x, pts[2].x)));
        const maxX = Math.min(W - 1, Math.ceil(Math.max(pts[0].x, pts[1].x, pts[2].x)));
        const minY = Math.max(0, Math.floor(Math.min(pts[0].y, pts[1].y, pts[2].y)));
        const maxY = Math.min(H - 1, Math.ceil(Math.max(pts[0].y, pts[1].y, pts[2].y)));
        if (minX > maxX || minY > maxY) return;
        const [p0, p1, p2] = pts;
        const den = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
        if (Math.abs(den) < 1e-9) return;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const w0 = ((p1.y - p2.y) * (x - p2.x) + (p2.x - p1.x) * (y - p2.y)) / den;
                const w1 = ((p2.y - p0.y) * (x - p2.x) + (p0.x - p2.x) * (y - p2.y)) / den;
                const w2 = 1 - w0 - w1;
                if (w0 < 0 || w1 < 0 || w2 < 0) continue;
                const z = w0 * p0.z + w1 * p1.z + w2 * p2.z;
                const idx = y * W + x;
                if (z >= zbuf[idx]) continue;
                zbuf[idx] = z;
                const f = Math.min(1, Math.max(0, (z - fogFar * 0.35) / (fogFar * 0.65)));
                const ff = f * f * (3 - 2 * f);
                const o = idx * 3;
                img[o] = Math.min(255, r * (1 - ff) + fogC[0] * ff);
                img[o + 1] = Math.min(255, g * (1 - ff) + fogC[1] * ff);
                img[o + 2] = Math.min(255, b * (1 - ff) + fogC[2] * ff);
            }
        }
    }

    function drawMesh(mesh, tx, ty, tz, yaw) {
        const cy = Math.cos(yaw || 0), sy = Math.sin(yaw || 0);
        const { pos, nrm, col, n } = mesh;
        for (let i = 0; i < n; i += 3) {
            const vs = [];
            for (let k = 0; k < 3; k++) {
                const j = (i + k) * 3;
                let px = pos[j], py = pos[j + 1], pz = pos[j + 2];
                if (yaw !== undefined) {
                    const rx = px * cy + pz * sy, rz = -px * sy + pz * cy;
                    px = rx + tx; py += ty; pz = rz + tz;
                }
                vs.push(toView(px, py, pz));
            }
            const j = i * 3;
            let nx = nrm[j], ny = nrm[j + 1], nz = nrm[j + 2];
            if (yaw !== undefined) {
                const rx = nx * cy + nz * sy, rz = -nx * sy + nz * cy;
                nx = rx; nz = rz;
            }
            const diff = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) * 0.55 + 0.55;
            drawTri(vs[0], vs[1], vs[2],
                    col[j] * diff * 255, col[j + 1] * diff * 255, col[j + 2] * diff * 255);
        }
    }

    drawMesh(world);
    for (const c of session.cars) {
        const mesh = carMeshes.get(c.short);
        drawMesh(mesh, c.x, hAt(c.idx) + 0.05, c.y, -c.heading);
    }

    savePNG(outFile, W, H, img);
    console.log(`${track}: ${world.n} world verts → ${outFile}`);
}

const track = process.argv[2] || 'monaco';
const out = process.argv[3] || `/tmp/snap_${track}.png`;
const idx = process.argv[4] !== undefined ? parseInt(process.argv[4], 10) : undefined;
render(track, out, idx);
