/* ============================================================
   F1 GL — low-poly WebGL renderer (PolyTrack-style aesthetic)
   Pure geometry/math builders are DOM-free and exported for
   headless testing; GLView needs a real WebGL context.
   ============================================================ */
'use strict';

/* ---------- mat4 (column-major) ---------- */
const M4 = {
    ident() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); },
    mul(a, b) {
        const o = new Float32Array(16);
        for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
            o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
        }
        return o;
    },
    persp(fovY, aspect, near, far) {
        const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
        const o = new Float32Array(16);
        o[0] = f / aspect; o[5] = f;
        o[10] = (far + near) * nf; o[11] = -1;
        o[14] = 2 * far * near * nf;
        return o;
    },
    lookAt(ex, ey, ez, tx, ty, tz) {
        let zx = ex - tx, zy = ey - ty, zz = ez - tz;
        let zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
        // x = up × z with up=(0,1,0)  →  (zz, 0, -zx). The previous negated
        // version made a left-handed basis that rendered the world rolled 180°.
        let xx = zz, xy_ = 0, xz = -zx;
        let xl = Math.hypot(xx, xy_, xz) || 1; xx /= xl; xz /= xl;
        const yx = zy * xz - zz * xy_, yy = zz * xx - zx * xz, yz = zx * xy_ - zy * xx;
        return new Float32Array([
            xx, yx, zx, 0,
            xy_, yy, zy, 0,
            xz, yz, zz, 0,
            -(xx*ex + xy_*ey + xz*ez), -(yx*ex + yy*ey + yz*ez), -(zx*ex + zy*ey + zz*ez), 1
        ]);
    },
    trs(x, y, z, yaw, pitch) {
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const cp = Math.cos(pitch || 0), sp = Math.sin(pitch || 0);
        // rotY(yaw) then rotZ(pitch), model forward = +X
        return new Float32Array([
            cy*cp, sp, -sy*cp, 0,
            -cy*sp, cp, sy*sp, 0,
            sy, 0, cy, 0,
            x, y, z, 1
        ]);
    }
};

/* ---------- geometry accumulator ---------- */
class MeshBuf {
    constructor() { this.pos = []; this.nrm = []; this.col = []; }
    tri(ax, ay, az, bx, by, bz, cx, cy, cz, r, g, b) {
        // flat normal
        const ux = bx-ax, uy = by-ay, uz = bz-az, vx = cx-ax, vy = cy-ay, vz = cz-az;
        let nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx/=l; ny/=l; nz/=l;
        this.pos.push(ax,ay,az, bx,by,bz, cx,cy,cz);
        this.nrm.push(nx,ny,nz, nx,ny,nz, nx,ny,nz);
        this.col.push(r,g,b, r,g,b, r,g,b);
    }
    quad(a, b, c, d, col) {   // a,b,c,d = [x,y,z] counter-clockwise
        this.tri(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2], col[0],col[1],col[2]);
        this.tri(a[0],a[1],a[2], c[0],c[1],c[2], d[0],d[1],d[2], col[0],col[1],col[2]);
    }
    box(x, y, z, sx, sy, sz, col, yaw) {
        const c = Math.cos(yaw || 0), s = Math.sin(yaw || 0);
        const p = (dx, dy, dz) => [x + dx*c + dz*s, y + dy, z - dx*s + dz*c];
        const hx = sx/2, hy = sy/2, hz = sz/2;
        const v000=p(-hx,-hy,-hz), v100=p(hx,-hy,-hz), v110=p(hx,hy,-hz), v010=p(-hx,hy,-hz);
        const v001=p(-hx,-hy,hz), v101=p(hx,-hy,hz), v111=p(hx,hy,hz), v011=p(-hx,hy,hz);
        this.quad(v010, v110, v111, v011, col);           // top
        this.quad(v001, v101, v100, v000, col);           // bottom
        this.quad(v000, v100, v110, v010, [col[0]*0.85, col[1]*0.85, col[2]*0.85]);
        this.quad(v101, v001, v011, v111, [col[0]*0.85, col[1]*0.85, col[2]*0.85]);
        this.quad(v100, v101, v111, v110, [col[0]*0.7, col[1]*0.7, col[2]*0.7]);
        this.quad(v001, v000, v010, v011, [col[0]*0.7, col[1]*0.7, col[2]*0.7]);
    }
    cone(x, y, z, r, h, col, segs) {
        segs = segs || 6;
        for (let i = 0; i < segs; i++) {
            const a0 = i / segs * 2 * Math.PI, a1 = (i + 1) / segs * 2 * Math.PI;
            this.tri(x, y + h, z,
                     x + Math.cos(a0)*r, y, z + Math.sin(a0)*r,
                     x + Math.cos(a1)*r, y, z + Math.sin(a1)*r,
                     col[0]*(0.8 + 0.2*Math.sin(a0)), col[1]*(0.8 + 0.2*Math.sin(a0)), col[2]*(0.8 + 0.2*Math.sin(a0)));
        }
    }
    merge(o) { this.pos.push(...o.pos); this.nrm.push(...o.nrm); this.col.push(...o.col); }
    count() { return this.pos.length / 3; }
    pack() {
        return {
            pos: new Float32Array(this.pos),
            nrm: new Float32Array(this.nrm),
            col: new Float32Array(this.col),
            n: this.pos.length / 3
        };
    }
}

/* ---------- looping elevation profile ---------- */
function heightProfile(cir, amp) {
    const N = cir.N, H = new Float32Array(N);
    if (!amp) return H;
    let seed = 0;
    for (const ch of cir.shortName) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    const ph1 = (seed % 628) / 100, ph2 = ((seed >> 3) % 628) / 100, ph3 = ((seed >> 6) % 628) / 100;
    for (let i = 0; i < N; i++) {
        const t = i / N * 2 * Math.PI;
        H[i] = amp * (0.55 * Math.sin(2*t + ph1) + 0.30 * Math.sin(3*t + ph2) + 0.15 * Math.sin(5*t + ph3));
    }
    // light smoothing so slopes stay gentle
    for (let pass = 0; pass < 2; pass++) {
        const S = new Float32Array(N);
        for (let i = 0; i < N; i++) S[i] = (H[(i-1+N)%N] + H[i]*2 + H[(i+1)%N]) / 4;
        H.set(S);
    }
    return H;
}

/* ---------- world geometry ---------- */
const PAL = {
    road: [0.145, 0.145, 0.185], roadAlt: [0.195, 0.195, 0.235],
    edge: [0.95, 0.95, 0.97],
    kerbR: [0.88, 0.16, 0.14], kerbW: [0.95, 0.95, 0.93],
    grassA: [0.28, 0.62, 0.26], grassB: [0.24, 0.55, 0.22],
    drs: [0.14, 0.42, 0.22],
    trunk: [0.42, 0.29, 0.18], leaf: [0.18, 0.55, 0.24], leaf2: [0.24, 0.65, 0.28],
    stand: [0.42, 0.46, 0.55], standRoof: [0.85, 0.87, 0.92],
    board: [0.94, 0.94, 0.94], boardRed: [0.88, 0.10, 0.08],
    gantry: [0.30, 0.32, 0.38],
    check: [0.94, 0.94, 0.94], checkD: [0.10, 0.10, 0.11]
};

function buildWorld(cir, def, H, rng) {
    rng = rng || Math.random;
    const m = new MeshBuf();
    const N = cir.N;
    const hAt = i => H[((i % N) + N) % N];
    const pt = (i, lat, lift) => {
        const s = cir.at(i);
        return [s.x + s.nx * lat, hAt(i) + (lift || 0), s.y + s.ny * lat];
    };

    // --- road ribbon + kerbs + edges + DRS tint ---
    for (let i = 0; i < N; i++) {
        const s = cir.at(i), hw = s.w / 2;
        const isStart = i < 2;
        const drs = cir.inDRS(i * cir.ds);
        let col = (i >> 1) % 2 === 0 ? PAL.road : PAL.roadAlt;   // ~13m stripes flicker past at speed
        if (drs) col = [col[0]*0.9 + PAL.drs[0]*0.25, col[1]*0.9 + PAL.drs[1]*0.25, col[2]*0.9 + PAL.drs[2]*0.25];
        if (isStart) {
            // checkered start strip
            const cols = 8;
            for (let q = 0; q < cols; q++) {
                const l0 = -hw + q / cols * s.w, l1 = -hw + (q + 1) / cols * s.w;
                m.quad(pt(i, l1, 0.06), pt(i + 1, l1, 0.06), pt(i + 1, l0, 0.06), pt(i, l0, 0.06),
                       (q + i) % 2 === 0 ? PAL.check : PAL.checkD);
            }
        } else {
            m.quad(pt(i, hw, 0.05), pt(i + 1, hw, 0.05), pt(i + 1, -hw, 0.05), pt(i, -hw, 0.05), col);
        }
        // white edge strips
        m.quad(pt(i, hw, 0.08), pt(i + 1, hw, 0.08), pt(i + 1, hw - 0.5, 0.08), pt(i, hw - 0.5, 0.08), PAL.edge);
        m.quad(pt(i, -hw + 0.5, 0.08), pt(i + 1, -hw + 0.5, 0.08), pt(i + 1, -hw, 0.08), pt(i, -hw, 0.08), PAL.edge);
        // marker posts every ~26m — dense trackside detail is the strongest speed cue
        if (i % 4 === 0) {
            const pc = (i >> 2) % 2 === 0 ? [0.92, 0.18, 0.15] : [0.95, 0.95, 0.97];
            const pl = pt(i, hw + 2.8, 0), pr = pt(i, -hw - 2.8, 0);
            m.box(pl[0], pl[1] + 0.55, pl[2], 0.22, 1.1, 0.22, pc, 0);
            m.box(pr[0], pr[1] + 0.55, pr[2], 0.22, 1.1, 0.22, pc, 0);
        }
        // kerbs: raised, vivid
        if (s.kerb) {
            const kc = (i >> 1) % 2 === 0 ? PAL.kerbR : PAL.kerbW;
            m.quad(pt(i, hw + 2.0, 0.02), pt(i + 1, hw + 2.0, 0.02), pt(i + 1, hw, 0.18), pt(i, hw, 0.18), kc);
            m.quad(pt(i, -hw, 0.18), pt(i + 1, -hw, 0.18), pt(i + 1, -hw - 2.0, 0.02), pt(i, -hw - 2.0, 0.02), kc);
        }
    }

    // --- grass: coarse two-tone grid following track height nearby ---
    const b = cir.bounds, mar = 190;
    const gx0 = b.minX - mar, gz0 = b.minY - mar;
    const gw = (b.maxX - b.minX) + 2 * mar, gh = (b.maxY - b.minY) + 2 * mar;
    const CELLS = 42;
    const cw = gw / CELLS, ch = gh / CELLS;
    // coarse nearest-track lookup
    const step = Math.max(1, Math.floor(N / 260));
    const hNear = (x, z) => {
        let bd = 1e18, bi = 0;
        for (let i = 0; i < N; i += step) {
            const s = cir.at(i);
            const d = (s.x - x) * (s.x - x) + (s.y - z) * (s.y - z);
            if (d < bd) { bd = d; bi = i; }
        }
        const d = Math.sqrt(bd);
        const fall = Math.max(0, 1 - d / 260);
        const hill = Math.sin(x * 0.011) * Math.cos(z * 0.013) * 6 * Math.min(1, d / 220);
        return hAt(bi) * fall - 0.35 + hill;
    };
    const gridH = [];
    for (let gz = 0; gz <= CELLS; gz++) {
        gridH.push([]);
        for (let gx = 0; gx <= CELLS; gx++) {
            gridH[gz].push(hNear(gx0 + gx * cw, gz0 + gz * ch));
        }
    }
    for (let gz = 0; gz < CELLS; gz++) {
        for (let gx = 0; gx < CELLS; gx++) {
            const x0 = gx0 + gx * cw, z0 = gz0 + gz * ch;
            const col = (gx + gz) % 2 === 0 ? PAL.grassA : PAL.grassB;
            m.quad(
                [x0, gridH[gz][gx], z0],
                [x0, gridH[gz + 1][gx], z0 + ch],
                [x0 + cw, gridH[gz + 1][gx + 1], z0 + ch],
                [x0 + cw, gridH[gz][gx + 1], z0],
                col
            );
        }
    }

    // --- trackside: trees, boards, grandstands ---
    for (let i = 0; i < N; i += 6) {
        const s = cir.at(i);
        const nearStart = i < 26 || i > N - 26;
        const side = (i % 12 === 0) ? 1 : -1;
        const h = hAt(i);
        if (nearStart && i % 12 === 0 && i > 3 && i < N - 3) {
            const off = s.w / 2 + 13;
            const x = s.x + s.nx * off, z = s.y + s.ny * off;
            const yaw = Math.atan2(s.ty, s.tx);
            m.box(x, h + 2.2, z, 20, 4.4, 6, PAL.stand, -yaw);
            m.box(x, h + 4.9, z, 21, 0.6, 7, PAL.standRoof, -yaw);
            // crowd: colored cubes
            for (let q = 0; q < 12; q++) {
                const cx2 = x + s.tx * (-9 + q * 1.6), cz2 = z + s.ty * (-9 + q * 1.6);
                m.box(cx2 + s.nx * (rng() - 0.5) * 3, h + 3.6 + rng() * 0.8, cz2 + s.ny * (rng() - 0.5) * 3,
                      0.7, 0.7, 0.7, [0.4 + rng() * 0.6, 0.35 + rng() * 0.5, 0.4 + rng() * 0.6], 0);
            }
        } else if (s.kerb && i % 18 === 0) {
            const off = s.w / 2 + 6;
            const x = s.x + s.nx * side * off, z = s.y + s.ny * side * off;
            const yaw = Math.atan2(s.ty, s.tx);
            m.box(x, h + 0.8, z, 0.3, 1.6, 0.3, PAL.gantry, -yaw);
            m.box(x, h + 2.0, z, 4.4, 1.1, 0.25, PAL.board, -yaw);
            m.box(x, h + 2.62, z, 4.4, 0.32, 0.27, PAL.boardRed, -yaw);
        } else if (rng() < 0.6) {
            const off = s.w / 2 + 9 + rng() * 16;
            const x = s.x + s.nx * side * off, z = s.y + s.ny * side * off;
            const sc = 0.8 + rng() * 0.9;
            m.box(x, h + 0.8 * sc, z, 0.5 * sc, 1.6 * sc, 0.5 * sc, PAL.trunk, 0);
            m.cone(x, h + 1.4 * sc, z, 2.1 * sc, 4.6 * sc, rng() < 0.5 ? PAL.leaf : PAL.leaf2, 6);
        }
    }

    // --- start gantry ---
    {
        const s = cir.at(2), hw = s.w / 2, h = hAt(2);
        const yaw = Math.atan2(s.ty, s.tx);
        const pL = [s.x + s.nx * (hw + 1.5), s.y + s.ny * (hw + 1.5)];
        const pR = [s.x - s.nx * (hw + 1.5), s.y - s.ny * (hw + 1.5)];
        m.box(pL[0], h + 3.0, pL[1], 0.8, 6.0, 0.8, PAL.gantry, -yaw);
        m.box(pR[0], h + 3.0, pR[1], 0.8, 6.0, 0.8, PAL.gantry, -yaw);
        m.box(s.x, h + 6.2, s.y, 1.2, 1.4, hw * 2 + 4, PAL.gantry, -yaw);
        for (let li = 0; li < 5; li++) {
            const lat = (li - 2) * 2.2;
            m.box(s.x + s.nx * lat, h + 5.3, s.y + s.ny * lat, 0.8, 0.8, 0.8, [0.25, 0.03, 0.03], -yaw);
        }
    }

    // --- clouds ---
    for (let i = 0; i < 10; i++) {
        const x = gx0 + rng() * gw, z = gz0 + rng() * gh;
        const y = 90 + rng() * 50, sc = 14 + rng() * 22;
        m.box(x, y, z, sc, sc * 0.28, sc * 0.55, [0.97, 0.98, 1.0], rng() * 3);
        m.box(x + sc * 0.4, y + sc * 0.1, z + sc * 0.2, sc * 0.6, sc * 0.22, sc * 0.4, [0.94, 0.96, 1.0], rng() * 3);
    }

    return m.pack();
}

/* ---------- low-poly F1 car ---------- */
function hexRGB(hex) {
    const h = parseInt(hex.slice(1), 16);
    return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
}

function buildCar(team) {
    const m = new MeshBuf();
    const c1 = hexRGB(team.c1), c2 = hexRGB(team.c2);
    const dark = [0.06, 0.06, 0.07];
    // main body (tapered box via quads)
    m.box(-0.3, 0.42, 0, 3.6, 0.5, 1.1, c1, 0);
    // nose
    m.tri(2.7, 0.35, 0,   1.5, 0.62, -0.5,  1.5, 0.62, 0.5,  c1[0], c1[1], c1[2]);
    m.tri(2.7, 0.35, 0,   1.5, 0.62, 0.5,   1.5, 0.20, 0.5,  c1[0]*0.85, c1[1]*0.85, c1[2]*0.85);
    m.tri(2.7, 0.35, 0,   1.5, 0.20, -0.5,  1.5, 0.62, -0.5, c1[0]*0.85, c1[1]*0.85, c1[2]*0.85);
    m.tri(2.7, 0.35, 0,   1.5, 0.20, 0.5,   1.5, 0.20, -0.5, c1[0]*0.7, c1[1]*0.7, c1[2]*0.7);
    // sidepods
    m.box(-0.5, 0.45, 0.72, 1.7, 0.42, 0.35, c2, 0);
    m.box(-0.5, 0.45, -0.72, 1.7, 0.42, 0.35, c2, 0);
    // cockpit + halo
    m.box(0.25, 0.78, 0, 0.9, 0.35, 0.6, dark, 0);
    m.box(0.25, 1.06, 0, 0.75, 0.10, 0.75, [0.55, 0.57, 0.60], 0);
    // engine cover fin
    m.box(-1.3, 0.82, 0, 1.4, 0.42, 0.22, c1, 0);
    // front wing
    m.box(2.45, 0.16, 0, 0.55, 0.10, 2.0, c2, 0);
    // rear wing
    m.box(-2.35, 0.95, 0, 0.5, 0.10, 1.9, c2, 0);
    m.box(-2.35, 0.55, 0.9, 0.12, 0.75, 0.12, dark, 0);
    m.box(-2.35, 0.55, -0.9, 0.12, 0.75, 0.12, dark, 0);
    // wheels (boxes read fine in low-poly)
    m.box(1.55, 0.34, 1.02, 0.72, 0.68, 0.38, dark, 0);
    m.box(1.55, 0.34, -1.02, 0.72, 0.68, 0.38, dark, 0);
    m.box(-1.65, 0.36, 1.05, 0.78, 0.72, 0.42, dark, 0);
    m.box(-1.65, 0.36, -1.05, 0.78, 0.72, 0.42, dark, 0);
    return m.pack();
}

/* shadow quad (unit, tinted at draw time) */
function buildShadow() {
    const m = new MeshBuf();
    m.quad([-2.6, 0, -1.15], [-2.6, 0, 1.15], [2.9, 0, 1.15], [2.9, 0, -1.15], [0, 0, 0]);
    return m.pack();
}

if (typeof globalThis !== 'undefined') {
    globalThis.F1GL = { M4, MeshBuf, heightProfile, buildWorld, buildCar, buildShadow, hexRGB, PAL };
}

/* ============================================================
   GLView — browser-only WebGL wrapper
   ============================================================ */
if (typeof document !== 'undefined' && typeof window !== 'undefined') {

class GLView {
    constructor(canvas) {
        this.canvas = canvas;
        this.ok = false;
        try {
            this.gl = canvas.getContext('webgl', { antialias: true }) ||
                      canvas.getContext('experimental-webgl');
            if (!this.gl) return;
            this._compile();
            this.ok = true;
        } catch (e) { this.ok = false; }
        this.carMeshes = {};
        this.cams = {};   // per-player smoothed camera state
    }

    cam(key) {
        if (!this.cams[key]) this.cams[key] = { pos: [0, 40, 0], tgt: [0, 0, 0], fov: 70 };
        return this.cams[key];
    }

    _compile() {
        const gl = this.gl;
        const vs = `
            attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol;
            uniform mat4 uProj, uView, uModel;
            varying vec3 vCol; varying float vDist;
            void main() {
                vec4 world = uModel * vec4(aPos, 1.0);
                vec4 viewP = uView * world;
                gl_Position = uProj * viewP;
                vec3 n = normalize(mat3(uModel) * aNrm);
                vec3 light = normalize(vec3(0.45, 0.85, 0.30));
                float diff = max(dot(n, light), 0.0) * 0.55 + 0.55;
                vCol = aCol * diff;
                vDist = length(viewP.xyz);
            }`;
        const fs = `
            precision mediump float;
            varying vec3 vCol; varying float vDist;
            uniform vec3 uFog; uniform float uFogFar; uniform float uAlpha;
            void main() {
                float f = smoothstep(uFogFar * 0.35, uFogFar, vDist);
                gl_FragColor = vec4(mix(vCol, uFog, f), uAlpha);
            }`;
        const mk = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
            return s;
        };
        const p = gl.createProgram();
        gl.attachShader(p, mk(gl.VERTEX_SHADER, vs));
        gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        this.prog = p;
        this.loc = {
            aPos: gl.getAttribLocation(p, 'aPos'),
            aNrm: gl.getAttribLocation(p, 'aNrm'),
            aCol: gl.getAttribLocation(p, 'aCol'),
            uProj: gl.getUniformLocation(p, 'uProj'),
            uView: gl.getUniformLocation(p, 'uView'),
            uModel: gl.getUniformLocation(p, 'uModel'),
            uFog: gl.getUniformLocation(p, 'uFog'),
            uFogFar: gl.getUniformLocation(p, 'uFogFar'),
            uAlpha: gl.getUniformLocation(p, 'uAlpha')
        };
    }

    _upload(mesh) {
        const gl = this.gl;
        const mk = data => {
            const b = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, b);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            return b;
        };
        return { pos: mk(mesh.pos), nrm: mk(mesh.nrm), col: mk(mesh.col), n: mesh.n };
    }

    load(cir, def, teams) {
        if (!this.ok) return;
        this.cams = {};
        this.cir = cir;
        this.H = heightProfile(cir, def.hills ?? 7);
        const world = buildWorld(cir, def, this.H, Math.random);
        this.world = this._upload(world);
        this.carMeshes = {};
        for (const t of teams) if (!this.carMeshes[t.short]) this.carMeshes[t.short] = this._upload(buildCar(t));
        this.shadow = this._upload(buildShadow());
    }

    hAt(i) { const N = this.cir.N; return this.H[((i % N) + N) % N]; }

    _bind(buf) {
        const gl = this.gl, L = this.loc;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.pos);
        gl.vertexAttribPointer(L.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(L.aPos);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.nrm);
        gl.vertexAttribPointer(L.aNrm, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(L.aNrm);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.col);
        gl.vertexAttribPointer(L.aCol, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(L.aCol);
    }

    render(session, car, mode, wetness, vp, dt, timeS) {
        if (!this.ok || !this.cir) return;
        const gl = this.gl, L = this.loc;
        const cw = this.canvas.width, chh = this.canvas.height;
        timeS = timeS || 0;

        gl.viewport(vp.x, chh - vp.y - vp.h, vp.w, vp.h);
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(vp.x, chh - vp.y - vp.h, vp.w, vp.h);

        // sky clear (fog color = horizon)
        const fog = wetness > 0.3 ? [0.62, 0.66, 0.70] : [0.78, 0.88, 0.97];
        gl.clearColor(fog[0], fog[1], fog[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);

        // camera
        const h = this.hAt(car.idx);
        const cosH = Math.cos(car.heading), sinH = Math.sin(car.heading);
        let ex, ey, ez, tx, ty, tz;
        if (mode === 'cockpit') {
            ex = car.x + cosH * 0.3; ez = car.y + sinH * 0.3; ey = h + 1.30;
            tx = car.x + cosH * 30; tz = car.y + sinH * 30; ty = h + 0.75;
        } else {
            const back = 7.8, up = 2.7;   // low + close = fast
            ex = car.x - cosH * back; ez = car.y - sinH * back; ey = h + up;
            tx = car.x + cosH * 10; tz = car.y + sinH * 10; ty = h + 1.0;
        }
        // high-speed camera shake
        const shakeAmt = Math.pow(Math.min(1, Math.abs(car.v) / 85), 2) * 0.10;
        if (shakeAmt > 0.005) {
            const sh1 = Math.sin(timeS * 41) + Math.sin(timeS * 67) * 0.6;
            const sh2 = Math.sin(timeS * 53 + 1.7) + Math.sin(timeS * 79) * 0.6;
            ey += sh1 * shakeAmt; ty += sh1 * shakeAmt * 0.5;
            ex += -sinH * sh2 * shakeAmt; ez += cosH * sh2 * shakeAmt;
        }
        // smooth (per-player camera so split screen doesn't thrash)
        const cam = this.cam(car.playerIndex >= 0 ? car.playerIndex : 'spec');
        const k = Math.min(1, (dt || 0.016) * (mode === 'cockpit' ? 60 : 7.5));
        cam.pos[0] += (ex - cam.pos[0]) * k;
        cam.pos[1] += (ey - cam.pos[1]) * k;
        cam.pos[2] += (ez - cam.pos[2]) * k;
        cam.tgt[0] += (tx - cam.tgt[0]) * Math.min(1, k * 1.6);
        cam.tgt[1] += (ty - cam.tgt[1]) * Math.min(1, k * 1.6);
        cam.tgt[2] += (tz - cam.tgt[2]) * Math.min(1, k * 1.6);

        // speed-FOV — the biggest "we're flying" lever, plus extra kick on ERS
        const boost = car.ersDeploying ? 6 : 0;
        const targetFov = (mode === 'cockpit' ? 76 : 68) + Math.min(36, Math.abs(car.v) * 0.40) + boost;
        cam.fov += (targetFov - cam.fov) * Math.min(1, (dt || 0.016) * 5);

        const proj = M4.persp(cam.fov * Math.PI / 180, vp.w / vp.h, 0.3, 900);
        const view = M4.lookAt(cam.pos[0], cam.pos[1], cam.pos[2],
                               cam.tgt[0], cam.tgt[1], cam.tgt[2]);

        gl.useProgram(this.prog);
        gl.uniformMatrix4fv(L.uProj, false, proj);
        gl.uniformMatrix4fv(L.uView, false, view);
        gl.uniform3fv(L.uFog, fog);
        gl.uniform1f(L.uFogFar, wetness > 0.3 ? 380 : 640);
        gl.uniform1f(L.uAlpha, 1.0);

        // world
        this._bind(this.world);
        gl.uniformMatrix4fv(L.uModel, false, M4.ident());
        gl.drawArrays(gl.TRIANGLES, 0, this.world.n);

        // cars
        for (const c of session.cars) {
            if (mode === 'cockpit' && c === car) continue;
            const ch2 = this.hAt(c.idx);
            const slope = (this.hAt(c.idx + 2) - this.hAt(c.idx - 2)) / (4 * this.cir.ds);
            const pitch = Math.atan(slope) * 0.8;
            const mdl = M4.trs(c.x, ch2 + 0.05, c.y, -c.heading, pitch);
            const mesh = this.carMeshes[c.short] || Object.values(this.carMeshes)[0];
            if (!mesh) continue;
            this._bind(mesh);
            gl.uniformMatrix4fv(L.uModel, false, mdl);
            gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
        }

        // blob shadows
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.uniform1f(L.uAlpha, 0.32);
        this._bind(this.shadow);
        for (const c of session.cars) {
            if (mode === 'cockpit' && c === car) continue;
            const mdl = M4.trs(c.x, this.hAt(c.idx) + 0.10, c.y, -c.heading, 0);
            gl.uniformMatrix4fv(L.uModel, false, mdl);
            gl.drawArrays(gl.TRIANGLES, 0, this.shadow.n);
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.disable(gl.SCISSOR_TEST);
    }
}

globalThis.GLView = GLView;

} /* end browser guard */
