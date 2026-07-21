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
    T(x, y, z) { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]); },
    rotY(a) { const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); },
    rotZ(a) { const c=Math.cos(a),s=Math.sin(a); return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); },
    // squash onto plane y=h along light dir L (planar projected shadows)
    flatten(h, L) {
        const a = L[0] / L[1], b = L[2] / L[1];
        return new Float32Array([
            1, 0, 0, 0,
            -a, 0, -b, 0,
            0, 0, 1, 0,
            a * h, h + 0.06, b * h, 1
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

/* ---------- procedural texture atlas (pure JS — browser & headless) ----------
   512x512 RGBA, 128px tiles. Tile (0,0) is plain white so untextured geometry
   multiplies through unchanged. */
const ATLAS_SIZE = 512, TILE = 128;
function buildAtlas() {
    const S = ATLAS_SIZE;
    const d = new Uint8Array(S * S * 4).fill(255);
    let rs = 12345;
    const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
    const px = (tx, ty, x, y, r, g, b, a) => {
        const o = ((ty * TILE + y) * S + tx * TILE + x) * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a === undefined ? 255 : a;
    };
    const fill = (tx, ty, fn) => {
        for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
            const c = fn(x, y);
            px(tx, ty, x, y, c[0], c[1], c[2], c[3]);
        }
    };

    // (1,0) asphalt: fine low-contrast grain with rare chips
    fill(1, 0, () => {
        const n = 96 + rnd() * 13;
        const chip = rnd() > 0.995 ? 34 : 0;
        return [n + chip, n + chip, n + chip + 5];
    });
    // (2,0) grass dark / (3,0) grass light: mottled greens
    fill(2, 0, () => { const n = rnd(); return [46 + n * 26, 96 + n * 34, 40 + n * 22]; });
    fill(3, 0, () => { const n = rnd(); return [58 + n * 30, 118 + n * 38, 50 + n * 24]; });
    // (0,1) kerb: red/white stripes along u with shading ramp across v
    fill(0, 1, (x, y) => {
        const red = ((x / TILE) * 4 | 0) % 2 === 0;
        const shade = 0.82 + 0.18 * (y / TILE);
        const n = 1 - rnd() * 0.08;
        return red ? [225 * shade * n, 42 * shade, 36 * shade] : [235 * shade * n, 233 * shade * n, 228 * shade * n];
    });
    // (1,1) crowd: rows of random people-coloured pixels on dark seats
    fill(1, 1, (x, y) => {
        if (y % 8 < 3) return [38 + rnd() * 10, 40 + rnd() * 10, 48 + rnd() * 10];
        if (rnd() < 0.85) {
            const h = rnd();
            return h < 0.3 ? [200 + rnd() * 55, 170 + rnd() * 40, 140 + rnd() * 40]
                 : [40 + rnd() * 215, 40 + rnd() * 180, 40 + rnd() * 215];
        }
        return [46, 48, 56];
    });
    // (2,1) armco: horizontal ribbed metal
    fill(2, 1, (x, y) => {
        const rib = Math.abs(Math.sin(y / TILE * Math.PI * 3));
        const v = 150 + rib * 70 - rnd() * 18;
        return [v, v + 3, v + 8];
    });
    // (3,1) banner: CRAZY GP block letters (5x7 font) red on white
    {
        const FONT = {
            C: ['0111', '1000', '1000', '1000', '1000', '1000', '0111'],
            R: ['1110', '1001', '1001', '1110', '1010', '1001', '1001'],
            A: ['0110', '1001', '1001', '1111', '1001', '1001', '1001'],
            Z: ['1111', '0001', '0010', '0100', '1000', '1000', '1111'],
            Y: ['1001', '1001', '0110', '0010', '0010', '0010', '0010'],
            G: ['0111', '1000', '1000', '1011', '1001', '1001', '0111'],
            P: ['1110', '1001', '1001', '1110', '1000', '1000', '1000'],
            ' ': ['0000', '0000', '0000', '0000', '0000', '0000', '0000']
        };
        fill(3, 1, (x, y) => (y < 10 || y > TILE - 10) ? [200, 30, 30] : [245, 245, 245]);
        const word = 'CRAZY GP';
        const scale = 3, cw = 5 * scale;
        let ox = Math.floor((TILE - word.length * cw) / 2);
        const oy = Math.floor((TILE - 7 * scale) / 2);
        for (const ch of word) {
            const glyph = FONT[ch];
            for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 4; gx++) {
                if (glyph[gy][gx] === '1') {
                    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
                        px(3, 1, ox + gx * scale + sx, oy + gy * scale + sy, 190, 25, 25);
                    }
                }
            }
            ox += cw;
        }
    }
    // (0,2) catch fence: thin diagonal grid, transparent holes
    fill(0, 2, (x, y) => {
        const on = (x + y) % 16 < 2 || (x - y & 15) < 2 || y < 3 || y > TILE - 4;
        return on ? [120, 124, 132, 255] : [0, 0, 0, 0];
    });
    // (1,2) pit wall: concrete with garage door slots
    fill(1, 2, (x, y) => {
        const door = (x % 43) > 6 && (x % 43) < 36 && y > 34;
        if (door) { const v = 52 + rnd() * 10 + (y % 9 < 2 ? 26 : 0); return [v, v, v + 4]; }
        const v = 168 + rnd() * 20;
        return [v, v - 4, v - 10];
    });
    // (2,2) rubbered racing line: slightly darker asphalt streaks
    fill(2, 2, (x) => {
        const n = 84 + rnd() * 22 + Math.abs(Math.sin(x / TILE * Math.PI)) * 10;
        return [n, n, n + 4];
    });
    // (3,2) start-line checker
    fill(3, 2, (x, y) => ((x / 16 | 0) + (y / 16 | 0)) % 2 === 0
        ? [235, 235, 235] : [22, 22, 24]);

    return { data: d, size: S };
}
// tile → inset uv rect helpers (2px inset against bleeding)
function uvTile(tx, ty) {
    const t = TILE / ATLAS_SIZE, inset = 2 / ATLAS_SIZE;
    return { u0: tx * t + inset, v0: ty * t + inset, u1: (tx + 1) * t - inset, v1: (ty + 1) * t - inset };
}
const T = {
    WHITE: uvTile(0, 0), ASPHALT: uvTile(1, 0), GRASS_D: uvTile(2, 0), GRASS_L: uvTile(3, 0),
    KERB: uvTile(0, 1), CROWD: uvTile(1, 1), ARMCO: uvTile(2, 1), BANNER: uvTile(3, 1),
    FENCE: uvTile(0, 2), PITWALL: uvTile(1, 2), RUBBER: uvTile(2, 2), CHECKER: uvTile(3, 2)
};

/* ---------- geometry accumulator ---------- */
class MeshBuf {
    constructor() { this.pos = []; this.nrm = []; this.col = []; this.uv = []; }
    tri(ax, ay, az, bx, by, bz, cx, cy, cz, r, g, b, uvs) {
        // flat normal
        const ux = bx-ax, uy = by-ay, uz = bz-az, vx = cx-ax, vy = cy-ay, vz = cz-az;
        let nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx/=l; ny/=l; nz/=l;
        this.pos.push(ax,ay,az, bx,by,bz, cx,cy,cz);
        this.nrm.push(nx,ny,nz, nx,ny,nz, nx,ny,nz);
        this.col.push(r,g,b, r,g,b, r,g,b);
        if (uvs) this.uv.push(uvs[0], uvs[1], uvs[2], uvs[3], uvs[4], uvs[5]);
        else this.uv.push(T.WHITE.u0, T.WHITE.v0, T.WHITE.u0, T.WHITE.v0, T.WHITE.u0, T.WHITE.v0);
    }
    quad(a, b, c, d, col) {   // a,b,c,d = [x,y,z] counter-clockwise
        this.tri(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2], col[0],col[1],col[2]);
        this.tri(a[0],a[1],a[2], c[0],c[1],c[2], d[0],d[1],d[2], col[0],col[1],col[2]);
    }
    triC(a, b, c, ca, cb, cc, uvs) {
        const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
        let nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx/=l; ny/=l; nz/=l;
        this.pos.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2]);
        this.nrm.push(nx,ny,nz, nx,ny,nz, nx,ny,nz);
        this.col.push(ca[0],ca[1],ca[2], cb[0],cb[1],cb[2], cc[0],cc[1],cc[2]);
        if (uvs) this.uv.push(uvs[0],uvs[1],uvs[2],uvs[3],uvs[4],uvs[5]);
        else this.uv.push(T.WHITE.u0,T.WHITE.v0, T.WHITE.u0,T.WHITE.v0, T.WHITE.u0,T.WHITE.v0);
    }
    quadTC(a, b, c, d, ca, cb, cc, cd, t) {   // textured quad with per-corner colours
        this.triC(a, b, c, ca, cb, cc, [t.u0,t.v0, t.u1,t.v0, t.u1,t.v1]);
        this.triC(a, c, d, ca, cc, cd, [t.u0,t.v0, t.u1,t.v1, t.u0,t.v1]);
    }
    cyl(x, y, z, rad, h, col, capCol, segs) {
        segs = segs || 8;
        for (let k = 0; k < segs; k++) {
            const a0 = k/segs*2*Math.PI, a1 = (k+1)/segs*2*Math.PI;
            const x0 = x+Math.cos(a0)*rad, z0 = z+Math.sin(a0)*rad;
            const x1 = x+Math.cos(a1)*rad, z1 = z+Math.sin(a1)*rad;
            const sh = 0.75 + 0.25*Math.abs(Math.cos((a0+a1)/2));
            this.quad([x0,y,z0],[x0,y+h,z0],[x1,y+h,z1],[x1,y,z1],[col[0]*sh,col[1]*sh,col[2]*sh]);
            this.tri(x, y+h, z, x1, y+h, z1, x0, y+h, z0, capCol[0], capCol[1], capCol[2]);
        }
    }
    quadT(a, b, c, d, col, t) {  // textured quad: a=(u0,v0) b=(u1,v0) c=(u1,v1) d=(u0,v1)
        this.tri(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2], col[0],col[1],col[2],
                 [t.u0, t.v0, t.u1, t.v0, t.u1, t.v1]);
        this.tri(a[0],a[1],a[2], c[0],c[1],c[2], d[0],d[1],d[2], col[0],col[1],col[2],
                 [t.u0, t.v0, t.u1, t.v1, t.u0, t.v1]);
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
    merge(o) { this.pos.push(...o.pos); this.nrm.push(...o.nrm); this.col.push(...o.col); this.uv.push(...o.uv); }
    count() { return this.pos.length / 3; }
    pack() {
        return {
            pos: new Float32Array(this.pos),
            nrm: new Float32Array(this.nrm),
            col: new Float32Array(this.col),
            uv: new Float32Array(this.uv),
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
    // shift so the LOWEST point of the lap sits at y=0 — everything in the
    // world (base disc, mountains, grass) can then safely live below the track
    let lo = Infinity;
    for (let i = 0; i < N; i++) lo = Math.min(lo, H[i]);
    for (let i = 0; i < N; i++) H[i] -= lo;
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
    const WHITE = [1, 1, 1];

    // --- road ribbon: textured asphalt, rubbered line, kerbs, edges ---
    for (let i = 0; i < N; i++) {
        const s = cir.at(i), hw = s.w / 2;
        const isStart = i < 2;
        const drs = cir.inDRS(i * cir.ds);
        const shade = (i >> 1) % 2 === 0 ? 0.93 : 1.0;
        const col = [shade, shade, shade];
        if (isStart) {
            m.quadT(pt(i, hw, 0.06), pt(i + 1, hw, 0.06), pt(i + 1, -hw, 0.06), pt(i, -hw, 0.06), WHITE, T.CHECKER);
        } else {
            // asphalt with worn darker edges (cheap ambient occlusion)
            const eC = [col[0] * 0.82, col[1] * 0.82, col[2] * 0.84];
            m.quadTC(pt(i, hw, 0.05), pt(i + 1, hw, 0.05), pt(i + 1, 0, 0.05), pt(i, 0, 0.05),
                     eC, eC, col, col, T.ASPHALT);
            m.quadTC(pt(i, 0, 0.05), pt(i + 1, 0, 0.05), pt(i + 1, -hw, 0.05), pt(i, -hw, 0.05),
                     col, col, eC, eC, T.ASPHALT);
            // faint rubbered racing line
            m.quadT(pt(i, 1.6, 0.055), pt(i + 1, 1.6, 0.055), pt(i + 1, -1.6, 0.055), pt(i, -1.6, 0.055),
                    [0.86, 0.86, 0.88], T.RUBBER);
        }
        // braking-zone skid marks: dark twin streaks where speed drops hard ahead
        if (!isStart && cir.at(i).vc > 50 && cir.at(i + 9).vc < 38) {
            for (const lat of [1.0, -1.0]) {
                m.quadT(pt(i, lat + 0.45, 0.065), pt(i + 1, lat + 0.45, 0.065),
                        pt(i + 1, lat - 0.45, 0.065), pt(i, lat - 0.45, 0.065),
                        [0.38, 0.38, 0.40], T.RUBBER);
            }
        }
        // edge strips — bright green inside DRS zones, white elsewhere
        const edgeCol = drs && !isStart ? [0.1, 0.9, 0.35] : PAL.edge;
        m.quad(pt(i, hw, 0.08), pt(i + 1, hw, 0.08), pt(i + 1, hw - 0.5, 0.08), pt(i, hw - 0.5, 0.08), edgeCol);
        m.quad(pt(i, -hw + 0.5, 0.08), pt(i + 1, -hw + 0.5, 0.08), pt(i + 1, -hw, 0.08), pt(i, -hw, 0.08), edgeCol);
        // striped kerbs
        if (s.kerb) {
            m.quadT(pt(i, hw + 2.0, 0.02), pt(i + 1, hw + 2.0, 0.02), pt(i + 1, hw, 0.18), pt(i, hw, 0.18), WHITE, T.KERB);
            m.quadT(pt(i, -hw, 0.18), pt(i + 1, -hw, 0.18), pt(i + 1, -hw - 2.0, 0.02), pt(i, -hw - 2.0, 0.02), WHITE, T.KERB);
        }
        // marker posts
        if (i % 4 === 0) {
            const pc = (i >> 2) % 2 === 0 ? [0.92, 0.18, 0.15] : [0.95, 0.95, 0.97];
            const pl = pt(i, hw + 2.8, 0), pr = pt(i, -hw - 2.8, 0);
            m.box(pl[0], pl[1] + 0.55, pl[2], 0.22, 1.1, 0.22, pc, 0);
            m.box(pr[0], pr[1] + 0.55, pr[2], 0.22, 1.1, 0.22, pc, 0);
        }
    }

    // --- mown grass bands, armco walls, catch fencing ---
    for (let i = 0; i < N; i++) {
        const s = cir.at(i), hw = s.w / 2;
        const light = (i >> 3) % 2 === 0;
        const bandT = light ? T.GRASS_L : T.GRASS_D;
        const bandT2 = light ? T.GRASS_D : T.GRASS_L;
        m.quadT(pt(i, hw + 2.2, 0.01), pt(i + 1, hw + 2.2, 0.01), pt(i + 1, hw + 4.4, 0.01), pt(i, hw + 4.4, 0.01), WHITE, bandT);
        m.quadT(pt(i, hw + 4.4, 0.01), pt(i + 1, hw + 4.4, 0.01), pt(i + 1, hw + 6.4, 0.01), pt(i, hw + 6.4, 0.01), WHITE, bandT2);
        m.quadT(pt(i, -hw - 4.4, 0.01), pt(i + 1, -hw - 4.4, 0.01), pt(i + 1, -hw - 2.2, 0.01), pt(i, -hw - 2.2, 0.01), WHITE, bandT);
        m.quadT(pt(i, -hw - 6.4, 0.01), pt(i + 1, -hw - 6.4, 0.01), pt(i + 1, -hw - 4.4, 0.01), pt(i, -hw - 4.4, 0.01), WHITE, bandT2);
        const wallTint = (i >> 4) % 6 === 0 ? [1.0, 0.30, 0.26] : WHITE;
        const wOff = hw + 6.6, wh = 0.95;
        const a0 = pt(i, wOff, 0), a1 = pt(i + 1, wOff, 0);
        m.quadT([a0[0], a0[1] + wh, a0[2]], [a1[0], a1[1] + wh, a1[2]], [a1[0], a1[1], a1[2]], [a0[0], a0[1], a0[2]], wallTint, T.ARMCO);
        const b0 = pt(i, -wOff, 0), b1 = pt(i + 1, -wOff, 0);
        m.quadT([b0[0], b0[1], b0[2]], [b1[0], b1[1], b1[2]], [b1[0], b1[1] + wh, b1[2]], [b0[0], b0[1] + wh, b0[2]], wallTint, T.ARMCO);
        // catch fence above the wall
        const fh0 = wh, fh1 = wh + 2.3;
        m.quadT([a0[0], a0[1] + fh1, a0[2]], [a1[0], a1[1] + fh1, a1[2]], [a1[0], a1[1] + fh0, a1[2]], [a0[0], a0[1] + fh0, a0[2]], WHITE, T.FENCE);
        m.quadT([b0[0], b0[1] + fh0, b0[2]], [b1[0], b1[1] + fh0, b1[2]], [b1[0], b1[1] + fh1, b1[2]], [b0[0], b0[1] + fh1, b0[2]], WHITE, T.FENCE);
    }

    // --- grass field grid ---
    const b = cir.bounds, mar = 190;
    const gx0 = b.minX - mar, gz0 = b.minY - mar;
    const gw = (b.maxX - b.minX) + 2 * mar, gh = (b.maxY - b.minY) + 2 * mar;
    const CELLS = 42;
    const cw = gw / CELLS, ch = gh / CELLS;
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
            const tone = (gx + gz) % 2 === 0 ? 1.0 : 0.88;
            m.quadT(
                [x0, gridH[gz][gx], z0],
                [x0, gridH[gz + 1][gx], z0 + ch],
                [x0 + cw, gridH[gz + 1][gx + 1], z0 + ch],
                [x0 + cw, gridH[gz][gx + 1], z0],
                [tone, tone, tone], T.GRASS_D
            );
        }
    }

    // --- pit building along the start straight ---
    {
        const side = -1, off0 = 11, depth = 8, hgt = 5.4;
        for (let r = -22; r < 4; r += 2) {
            const i = ((r % N) + N) % N;
            const s = cir.at(i), s2 = cir.at(i + 2);
            const hw = s.w / 2, hw2 = s2.w / 2;
            const fA = pt(i, side * (hw + off0), 0), fB = pt(i + 2, side * (hw2 + off0), 0);
            // track-facing wall with garage doors
            m.quadT([fA[0], fA[1] + hgt, fA[2]], [fB[0], fB[1] + hgt, fB[2]], [fB[0], fB[1], fB[2]], [fA[0], fA[1], fA[2]], WHITE, T.PITWALL);
            // banner strip on top
            m.quadT([fA[0], fA[1] + hgt + 1.3, fA[2]], [fB[0], fB[1] + hgt + 1.3, fB[2]], [fB[0], fB[1] + hgt, fB[2]], [fA[0], fA[1] + hgt, fA[2]], WHITE, T.BANNER);
            // roof sloping back
            const rA = pt(i, side * (hw + off0 + depth), 0), rB = pt(i + 2, side * (hw2 + off0 + depth), 0);
            m.quad([fA[0], fA[1] + hgt, fA[2]], [fB[0], fB[1] + hgt, fB[2]],
                   [rB[0], rB[1] + hgt - 0.6, rB[2]], [rA[0], rA[1] + hgt - 0.6, rA[2]], [0.62, 0.64, 0.68]);
        }
    }

    // --- trackside: grandstands with crowd texture, banners, trees ---
    for (let i = 0; i < N; i += 6) {
        const s = cir.at(i);
        const nearStart = i < 26 || i > N - 26;
        const side = (i % 12 === 0) ? 1 : -1;
        const h = hAt(i);
        if (nearStart && i % 18 === 0 && i > 3 && i < N - 3) {
            const off = s.w / 2 + 16;
            const bx = s.x + s.nx * off, bz = s.y + s.ny * off;
            const yaw = Math.atan2(s.ty, s.tx);
            // crowd face: big tilted quad facing the track
            const inX = s.nx * -3.2, inZ = s.ny * -3.2, outX = s.nx * 3.2, outZ = s.ny * 3.2;
            const tX = s.tx * 11, tZ = s.ty * 11;
            m.quadT(
                [bx - tX + outX, h + 4.6, bz - tZ + outZ],
                [bx + tX + outX, h + 4.6, bz + tZ + outZ],
                [bx + tX + inX, h + 0.7, bz + tZ + inZ],
                [bx - tX + inX, h + 0.7, bz - tZ + inZ],
                WHITE, T.CROWD);
            // structure: side walls, roof on posts
            m.box(bx, h + 0.35, bz, 22, 0.7, 7, [0.42, 0.45, 0.52], -yaw);
            for (const dx of [-10, 10]) {
                const px2 = bx + s.tx * dx + outX * 0.8, pz2 = bz + s.ty * dx + outZ * 0.8;
                m.box(px2, h + 3.4, pz2, 0.35, 5.6, 0.35, PAL.gantry, -yaw);
            }
            m.box(bx + outX * 0.35, h + 6.4, bz + outZ * 0.35, 23, 0.4, 8.5, PAL.standRoof, -yaw);
        } else if (s.kerb && i % 18 === 0) {
            const off = s.w / 2 + 9;
            const bx = s.x + s.nx * side * off, bz = s.y + s.ny * side * off;
            const tX = s.tx * 2.6, tZ = s.ty * 2.6;
            m.box(bx, h + 0.8, bz, 0.3, 1.6, 0.3, PAL.gantry, 0);
            m.quadT([bx - tX, h + 3.0, bz - tZ], [bx + tX, h + 3.0, bz + tZ],
                    [bx + tX, h + 1.7, bz + tZ], [bx - tX, h + 1.7, bz - tZ], WHITE, T.BANNER);
            m.quadT([bx + tX, h + 3.0, bz + tZ], [bx - tX, h + 3.0, bz - tZ],
                    [bx - tX, h + 1.7, bz - tZ], [bx + tX, h + 1.7, bz + tZ], WHITE, T.BANNER);
        } else if (rng() < 0.6) {
            const off = s.w / 2 + 10 + rng() * 16;
            const x = s.x + s.nx * side * off, z = s.y + s.ny * side * off;
            const sc = 0.8 + rng() * 0.9;
            m.box(x, h + 0.8 * sc, z, 0.5 * sc, 1.6 * sc, 0.5 * sc, PAL.trunk, 0);
            m.cone(x, h + 1.4 * sc, z, 2.1 * sc, 4.6 * sc, rng() < 0.5 ? PAL.leaf : PAL.leaf2, 6);
        } else if (rng() < 0.25) {
            // team flag on a pole
            const off = s.w / 2 + 8 + rng() * 6;
            const x = s.x + s.nx * side * off, z = s.y + s.ny * side * off;
            const FLAGS = [[0.86,0.08,0.06],[0.05,0.35,0.85],[1.0,0.5,0.0],[0.0,0.55,0.4],[0.9,0.85,0.1]];
            const fc = FLAGS[(i / 6 | 0) % FLAGS.length];
            m.box(x, h + 2.2, z, 0.12, 4.4, 0.12, [0.75, 0.77, 0.8], 0);
            m.quad([x, h + 4.3, z], [x + s.tx * 1.5, h + 4.15, z + s.ty * 1.5],
                   [x + s.tx * 1.5, h + 3.45, z + s.ty * 1.5], [x, h + 3.5, z], fc);
        }
        // tyre-stack barriers on the outside of slow corners
        if (s.vc < 28 && i % 8 === 0) {
            const d1 = cir.at(i + 2), d0 = cir.at(i);
            const cross = d0.tx * d1.ty - d0.ty * d1.tx;
            const outSide = cross > 0 ? -1 : 1;
            const off = s.w / 2 + 4.2;
            for (let q = 0; q < 3; q++) {
                const qx = s.x + s.nx * outSide * (off + (q % 2) * 1.1) + s.tx * (q - 1) * 1.2;
                const qz = s.y + s.ny * outSide * (off + (q % 2) * 1.1) + s.ty * (q - 1) * 1.2;
                m.cyl(qx, h, qz, 0.55, 0.95, [0.07, 0.07, 0.08], [0.88, 0.88, 0.9], 8);
            }
        }
    }

    // --- start gantry with banner beam ---
    {
        const s = cir.at(2), hw = s.w / 2, h = hAt(2);
        const yaw = Math.atan2(s.ty, s.tx);
        const pL = [s.x + s.nx * (hw + 1.5), s.y + s.ny * (hw + 1.5)];
        const pR = [s.x - s.nx * (hw + 1.5), s.y - s.ny * (hw + 1.5)];
        m.box(pL[0], h + 3.0, pL[1], 0.8, 6.0, 0.8, PAL.gantry, -yaw);
        m.box(pR[0], h + 3.0, pR[1], 0.8, 6.0, 0.8, PAL.gantry, -yaw);
        // banner faces on the beam
        const nx = s.nx * (hw + 1.5), nz = s.ny * (hw + 1.5);
        const fx = s.tx * 0.7, fz = s.ty * 0.7;
        m.quadT([s.x - nx - fx, h + 7.0, s.y - nz - fz], [s.x + nx - fx, h + 7.0, s.y + nz - fz],
                [s.x + nx - fx, h + 5.6, s.y + nz - fz], [s.x - nx - fx, h + 5.6, s.y - nz - fz], WHITE, T.BANNER);
        m.quadT([s.x + nx + fx, h + 7.0, s.y + nz + fz], [s.x - nx + fx, h + 7.0, s.y - nz + fz],
                [s.x - nx + fx, h + 5.6, s.y - nz + fz], [s.x + nx + fx, h + 5.6, s.y + nz + fz], WHITE, T.BANNER);
        m.box(s.x, h + 7.2, s.y, 1.4, 0.4, hw * 2 + 4, PAL.gantry, -yaw);
        for (let li = 0; li < 5; li++) {
            const lat = (li - 2) * 2.2;
            m.box(s.x + s.nx * lat, h + 5.1, s.y + s.ny * lat, 0.8, 0.8, 0.8, [0.25, 0.03, 0.03], -yaw);
        }
    }

    // --- clouds: big puffy stacks ---
    for (let i = 0; i < 7; i++) {
        const x = gx0 + rng() * gw, z = gz0 + rng() * gh;
        const y = 150 + rng() * 70, sc = 34 + rng() * 30;
        m.box(x, y, z, sc, sc * 0.30, sc * 0.62, [0.99, 0.99, 1.0], rng() * 3);
        m.box(x + sc * 0.32, y + sc * 0.16, z + sc * 0.15, sc * 0.62, sc * 0.30, sc * 0.45, [0.97, 0.98, 1.0], rng() * 3);
        m.box(x - sc * 0.3, y + sc * 0.10, z - sc * 0.12, sc * 0.5, sc * 0.24, sc * 0.4, [0.95, 0.97, 1.0], rng() * 3);
    }

    // --- horizon: base disc + mountain ring ---
    const DISC_Y = -9;
    const ccx = (b.minX + b.maxX) / 2, ccz = (b.minY + b.maxY) / 2;
    const baseR = Math.max(gw, gh) / 2 + 60;
    for (let k = 0; k < 24; k++) {
        const a0 = k / 24 * 2 * Math.PI, a1 = (k + 1) / 24 * 2 * Math.PI;
        m.tri(ccx, DISC_Y, ccz,
              ccx + Math.cos(a1) * 2400, DISC_Y, ccz + Math.sin(a1) * 2400,
              ccx + Math.cos(a0) * 2400, DISC_Y, ccz + Math.sin(a0) * 2400,
              0.20, 0.34, 0.18);
    }
    for (let k = 0; k < 30; k++) {
        const a = k / 30 * 2 * Math.PI;
        const r = baseR + 80 + rng() * 120;
        const px2 = ccx + Math.cos(a) * r, pz2 = ccz + Math.sin(a) * r;
        const hM = 45 + rng() * 75, wM = 130 + rng() * 130;
        const perp = a + Math.PI / 2;
        const col = rng() < 0.5 ? [0.40, 0.52, 0.62] : [0.35, 0.48, 0.58];
        m.tri(px2, hM, pz2,
              px2 + Math.cos(perp) * wM, DISC_Y, pz2 + Math.sin(perp) * wM,
              px2 - Math.cos(perp) * wM, DISC_Y, pz2 - Math.sin(perp) * wM,
              col[0], col[1], col[2]);
    }
    // second, farther, lighter mountain layer for depth
    for (let k = 0; k < 22; k++) {
        const a = (k + 0.5) / 22 * 2 * Math.PI;
        const r = baseR + 320 + rng() * 160;
        const px2 = ccx + Math.cos(a) * r, pz2 = ccz + Math.sin(a) * r;
        const hM = 90 + rng() * 90, wM = 220 + rng() * 180;
        const perp = a + Math.PI / 2;
        m.tri(px2, hM, pz2,
              px2 + Math.cos(perp) * wM, DISC_Y, pz2 + Math.sin(perp) * wM,
              px2 - Math.cos(perp) * wM, DISC_Y, pz2 - Math.sin(perp) * wM,
              0.56, 0.66, 0.77);
    }

    return m.pack();
}

/* ---------- sky dome + sun (drawn fog-free) ---------- */
function buildSky(cir) {
    const m = new MeshBuf();
    const b = cir.bounds;
    const cx = (b.minX + b.maxX) / 2, cz = (b.minY + b.maxY) / 2;
    const R = 1900;
    const zen = [0.15, 0.42, 0.92], hor = [0.55, 0.76, 0.94];
    const RINGS = 6, SEGS = 18;
    const pt = (ri, si) => {
        const e = ri / RINGS * Math.PI / 2, a = si / SEGS * 2 * Math.PI;
        return [cx + Math.cos(a) * Math.cos(e) * R, -12 + Math.sin(e) * R * 0.5, cz + Math.sin(a) * Math.cos(e) * R];
    };
    const colAt = ri => {
        const t = Math.pow(ri / RINGS, 0.5);
        return [hor[0] + (zen[0] - hor[0]) * t, hor[1] + (zen[1] - hor[1]) * t, hor[2] + (zen[2] - hor[2]) * t];
    };
    for (let ri = 0; ri < RINGS; ri++) {
        for (let si = 0; si < SEGS; si++) {
            const c0 = colAt(ri), c1 = colAt(ri + 1);
            m.quadTC(pt(ri, si), pt(ri, si + 1), pt(ri + 1, si + 1), pt(ri + 1, si), c0, c0, c1, c1, T.WHITE);
        }
    }
    // sun disc + halo toward the light direction
    const L = [0.45, 0.85, 0.30], ll = Math.hypot(...L);
    const sd = L.map(v => v / ll);
    const sc = [cx + sd[0] * R * 0.92, -12 + sd[1] * R * 0.46, cz + sd[2] * R * 0.92];
    const up = [0, 1, 0];
    const rt = [sd[1] * up[2] - sd[2] * up[1], sd[2] * up[0] - sd[0] * up[2], sd[0] * up[1] - sd[1] * up[0]];
    const rl = Math.hypot(...rt); rt[0] /= rl; rt[1] /= rl; rt[2] /= rl;
    const up2 = [rt[1] * sd[2] - rt[2] * sd[1], rt[2] * sd[0] - rt[0] * sd[2], rt[0] * sd[1] - rt[1] * sd[0]];
    const disc = (rad, col) => {
        for (let k = 0; k < 8; k++) {
            const a0 = k / 8 * 2 * Math.PI, a1 = (k + 1) / 8 * 2 * Math.PI;
            m.tri(sc[0], sc[1], sc[2],
                  sc[0] + (rt[0] * Math.cos(a1) + up2[0] * Math.sin(a1)) * rad,
                  sc[1] + (rt[1] * Math.cos(a1) + up2[1] * Math.sin(a1)) * rad,
                  sc[2] + (rt[2] * Math.cos(a1) + up2[2] * Math.sin(a1)) * rad,
                  sc[0] + (rt[0] * Math.cos(a0) + up2[0] * Math.sin(a0)) * rad,
                  sc[1] + (rt[1] * Math.cos(a0) + up2[1] * Math.sin(a0)) * rad,
                  sc[2] + (rt[2] * Math.cos(a0) + up2[2] * Math.sin(a0)) * rad,
                  col[0], col[1], col[2]);
        }
    };
    disc(210, [0.88, 0.88, 0.78]);
    disc(120, [0.99, 0.97, 0.84]);
    disc(55, [1.0, 1.0, 0.96]);
    return m.pack();
}

/* ---------- spinning wheel mesh (octagonal, rim face) ---------- */
function buildWheel(rad, width) {
    const m = new MeshBuf();
    const dark = [0.05, 0.05, 0.06], rim = [0.70, 0.70, 0.75];
    for (let k = 0; k < 8; k++) {
        const a0 = k / 8 * 2 * Math.PI, a1 = (k + 1) / 8 * 2 * Math.PI;
        const x0 = Math.cos(a0) * rad, y0 = Math.sin(a0) * rad;
        const x1 = Math.cos(a1) * rad, y1 = Math.sin(a1) * rad;
        // tread
        m.quad([x0, y0, -width / 2], [x1, y1, -width / 2], [x1, y1, width / 2], [x0, y0, width / 2], dark);
        // side walls with rim centre
        m.tri(0, 0, width / 2, x1 * 0.55, y1 * 0.55, width / 2, x0 * 0.55, y0 * 0.55, width / 2,
              k % 2 === 0 ? rim[0] : rim[0] * 0.7, k % 2 === 0 ? rim[1] : rim[1] * 0.7, k % 2 === 0 ? rim[2] : rim[2] * 0.7);
        m.quad([x0 * 0.55, y0 * 0.55, width / 2], [x1 * 0.55, y1 * 0.55, width / 2], [x1, y1, width / 2], [x0, y0, width / 2], dark);
        m.tri(0, 0, -width / 2, x0 * 0.55, y0 * 0.55, -width / 2, x1 * 0.55, y1 * 0.55, -width / 2,
              k % 2 === 0 ? rim[0] : rim[0] * 0.7, k % 2 === 0 ? rim[1] : rim[1] * 0.7, k % 2 === 0 ? rim[2] : rim[2] * 0.7);
        m.quad([x0, y0, -width / 2], [x1, y1, -width / 2], [x1 * 0.55, y1 * 0.55, -width / 2], [x0 * 0.55, y0 * 0.55, -width / 2], dark);
    }
    return m.pack();
}
const WHEEL_POS = [
    { x: 1.60, y: 0.34, z: 0.98, front: true },
    { x: 1.60, y: 0.34, z: -0.98, front: true },
    { x: -1.60, y: 0.35, z: 1.00, front: false },
    { x: -1.60, y: 0.35, z: -1.00, front: false }
];

/* ---------- low-poly F1 car ---------- */
function hexRGB(hex) {
    const h = parseInt(hex.slice(1), 16);
    return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
}

function buildCar(team) {
    const m = new MeshBuf();
    const c1 = hexRGB(team.c1), c2 = hexRGB(team.c2);
    const c1d = [c1[0] * 0.88, c1[1] * 0.88, c1[2] * 0.88];
    const dark = [0.06, 0.06, 0.07];
    const carbon = [0.13, 0.13, 0.15];
    const rim = [0.72, 0.72, 0.76];
    // long low hull in team primary
    m.box(-0.35, 0.36, 0, 4.3, 0.40, 0.92, c1, 0);
    // floor plank shadow line
    m.box(-0.2, 0.14, 0, 4.4, 0.06, 1.05, carbon, 0);
    // sidepods with radiator inlet darker front face
    m.box(-0.55, 0.40, 0.60, 2.0, 0.34, 0.34, c1d, 0);
    m.box(-0.55, 0.40, -0.60, 2.0, 0.34, 0.34, c1d, 0);
    m.box(0.42, 0.42, 0.60, 0.06, 0.26, 0.28, carbon, 0);
    m.box(0.42, 0.42, -0.60, 0.06, 0.26, 0.28, carbon, 0);
    // nose cone
    m.tri(2.95, 0.32, 0,   1.75, 0.56, -0.42,  1.75, 0.56, 0.42,  c1[0], c1[1], c1[2]);
    m.tri(2.95, 0.32, 0,   1.75, 0.56, 0.42,   1.75, 0.18, 0.42,  c1[0]*0.85, c1[1]*0.85, c1[2]*0.85);
    m.tri(2.95, 0.32, 0,   1.75, 0.18, -0.42,  1.75, 0.56, -0.42, c1[0]*0.85, c1[1]*0.85, c1[2]*0.85);
    m.tri(2.95, 0.32, 0,   1.75, 0.18, 0.42,   1.75, 0.18, -0.42, c1[0]*0.7, c1[1]*0.7, c1[2]*0.7);
    // accent stripe along the spine
    m.box(0.15, 0.585, 0, 2.6, 0.05, 0.34, c2, 0);
    // cockpit, driver helmet, halo
    m.box(0.25, 0.72, 0, 0.85, 0.30, 0.55, dark, 0);
    m.box(0.18, 0.92, 0, 0.30, 0.24, 0.30, [0.9, 0.9, 0.95], 0);   // helmet
    m.box(0.25, 1.02, 0, 0.70, 0.06, 0.68, [0.55, 0.57, 0.60], 0); // halo ring
    m.box(0.62, 0.90, 0, 0.06, 0.22, 0.06, [0.55, 0.57, 0.60], 0); // halo pillar
    // airbox + engine cover fin
    m.box(-0.45, 0.98, 0, 0.55, 0.30, 0.34, c1, 0);
    m.box(-1.35, 0.80, 0, 1.6, 0.42, 0.14, c1, 0);
    // T-cam
    m.box(-0.45, 1.20, 0, 0.16, 0.14, 0.30, [0.95, 0.2, 0.1], 0);
    // front wing: main plane + flaps + endplates
    m.box(2.62, 0.12, 0, 0.60, 0.07, 2.0, c2, 0);
    m.box(2.45, 0.22, 0, 0.30, 0.06, 1.7, [c2[0]*0.8, c2[1]*0.8, c2[2]*0.8], 0);
    m.box(2.62, 0.24, 1.0, 0.62, 0.30, 0.07, carbon, 0);
    m.box(2.62, 0.24, -1.0, 0.62, 0.30, 0.07, carbon, 0);
    // rear wing: narrower plane, slim endplates, pylon + beam wing
    m.box(-2.40, 0.98, 0, 0.46, 0.07, 1.45, c2, 0);
    m.box(-2.40, 0.82, 0.74, 0.50, 0.42, 0.05, carbon, 0);
    m.box(-2.40, 0.82, -0.74, 0.50, 0.42, 0.05, carbon, 0);
    m.box(-2.40, 0.56, 0, 0.09, 0.80, 0.09, dark, 0);
    m.box(-2.32, 0.44, 0, 0.30, 0.05, 1.15, carbon, 0);
    // diffuser
    m.box(-2.30, 0.20, 0, 0.45, 0.16, 1.05, carbon, 0);
    // suspension arms (thin diagonals)
    for (const s of [1, -1]) {
        m.box(1.35, 0.42, s * 0.55, 0.06, 0.05, 0.9, carbon, 0);
        m.box(1.80, 0.38, s * 0.55, 0.06, 0.05, 0.9, carbon, 0);
        m.box(-1.40, 0.44, s * 0.58, 0.06, 0.05, 0.9, carbon, 0);
    }
    return m.pack();
}

/* shadow quad (unit, tinted at draw time) */
function buildShadow() {
    const m = new MeshBuf();
    m.quad([-2.6, 0, -1.15], [-2.6, 0, 1.15], [2.9, 0, 1.15], [2.9, 0, -1.15], [0, 0, 0]);
    return m.pack();
}

if (typeof globalThis !== 'undefined') {
    globalThis.F1GL = { M4, MeshBuf, heightProfile, buildWorld, buildCar, buildShadow, buildSky, buildWheel, WHEEL_POS, hexRGB, PAL, buildAtlas, T, ATLAS_SIZE };
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
            attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol; attribute vec2 aUV;
            uniform mat4 uProj, uView, uModel;
            uniform vec3 uEye; uniform float uSpec;
            varying vec3 vCol; varying float vDist; varying vec2 vUV; varying float vSpec;
            void main() {
                vec4 world = uModel * vec4(aPos, 1.0);
                vec4 viewP = uView * world;
                gl_Position = uProj * viewP;
                vec3 n = normalize(mat3(uModel) * aNrm);
                vec3 light = normalize(vec3(0.45, 0.85, 0.30));
                float diff = max(dot(n, light), 0.0) * 0.55 + 0.55;
                vCol = aCol * diff;
                vec3 V = normalize(uEye - world.xyz);
                vSpec = uSpec * pow(max(dot(reflect(-light, n), V), 0.0), 22.0) * 0.7;
                vDist = length(viewP.xyz);
                vUV = aUV;
            }`;
        const fs = `
            precision mediump float;
            varying vec3 vCol; varying float vDist; varying vec2 vUV; varying float vSpec;
            uniform vec3 uFog; uniform float uFogFar; uniform float uAlpha;
            uniform vec4 uOverride;
            uniform sampler2D uTex;
            void main() {
                vec4 t = texture2D(uTex, vUV);
                if (t.a < 0.5) discard;
                vec3 c = t.rgb * vCol + vec3(vSpec);
                if (uOverride.a > 0.5) c = uOverride.rgb;
                float f = smoothstep(uFogFar * 0.55, uFogFar, vDist);
                gl_FragColor = vec4(mix(c, uFog, f), uAlpha);
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
            aUV: gl.getAttribLocation(p, 'aUV'),
            uProj: gl.getUniformLocation(p, 'uProj'),
            uView: gl.getUniformLocation(p, 'uView'),
            uModel: gl.getUniformLocation(p, 'uModel'),
            uFog: gl.getUniformLocation(p, 'uFog'),
            uFogFar: gl.getUniformLocation(p, 'uFogFar'),
            uAlpha: gl.getUniformLocation(p, 'uAlpha'),
            uTex: gl.getUniformLocation(p, 'uTex'),
            uEye: gl.getUniformLocation(p, 'uEye'),
            uSpec: gl.getUniformLocation(p, 'uSpec'),
            uOverride: gl.getUniformLocation(p, 'uOverride')
        };

        // procedural atlas texture
        const atlas = buildAtlas();
        this.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, atlas.size, atlas.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlas.data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    _upload(mesh) {
        const gl = this.gl;
        const mk = data => {
            const b = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, b);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            return b;
        };
        return { pos: mk(mesh.pos), nrm: mk(mesh.nrm), col: mk(mesh.col), uv: mk(mesh.uv), n: mesh.n };
    }

    load(cir, def, teams) {
        if (!this.ok) return;
        this.cams = {};
        this.cir = cir;
        this.H = heightProfile(cir, def.hills ?? 7);
        const world = buildWorld(cir, def, this.H, Math.random);
        this.world = this._upload(world);
        this.sky = this._upload(buildSky(cir));
        this.carMeshes = {};
        for (const t of teams) if (!this.carMeshes[t.short]) this.carMeshes[t.short] = this._upload(buildCar(t));
        this.wheelF = this._upload(buildWheel(0.34, 0.36));
        this.wheelR = this._upload(buildWheel(0.37, 0.40));
        this.lightCube = this._upload((() => { const m = new MeshBuf(); m.box(0, 0, 0, 0.7, 0.7, 0.5, [1, 1, 1], 0); return m.pack(); })());
        const s2 = cir.at(2), h2 = this.hAt(2);
        this.startLights = [];
        for (let li = 0; li < 5; li++) {
            const lat = (li - 2) * 2.2;
            this.startLights.push([s2.x + s2.nx * lat, h2 + 5.1, s2.y + s2.ny * lat]);
        }
        this.LIGHT = [0.45, 0.85, 0.30];
        const ll = Math.hypot(...this.LIGHT);
        this.LIGHT = this.LIGHT.map(v => v / ll);
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
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.uv);
        gl.vertexAttribPointer(L.aUV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(L.aUV);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.uniform1i(L.uTex, 0);
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

        const proj = M4.persp(cam.fov * Math.PI / 180, vp.w / vp.h, 0.3, 3000);
        const view = M4.lookAt(cam.pos[0], cam.pos[1], cam.pos[2],
                               cam.tgt[0], cam.tgt[1], cam.tgt[2]);

        gl.useProgram(this.prog);
        gl.uniformMatrix4fv(L.uProj, false, proj);
        gl.uniformMatrix4fv(L.uView, false, view);
        gl.uniform3fv(L.uFog, fog);
        gl.uniform1f(L.uAlpha, 1.0);
        gl.uniform3f(L.uEye, cam.pos[0], cam.pos[1], cam.pos[2]);
        gl.uniform1f(L.uSpec, 0);
        gl.uniform4f(L.uOverride, 0, 0, 0, 0);

        // sky dome + sun (no fog)
        gl.uniform1f(L.uFogFar, 1e9);
        this._bind(this.sky);
        gl.uniformMatrix4fv(L.uModel, false, M4.ident());
        gl.drawArrays(gl.TRIANGLES, 0, this.sky.n);

        // world
        gl.uniform1f(L.uFogFar, wetness > 0.3 ? 420 : 1150);
        this._bind(this.world);
        gl.uniformMatrix4fv(L.uModel, false, M4.ident());
        gl.drawArrays(gl.TRIANGLES, 0, this.world.n);

        // start lights (live with the countdown)
        const lit = session.state === 'countdown'
            ? Math.max(0, Math.min(5, Math.ceil((3.6 - session.countdown) / 0.6))) : 0;
        this._bind(this.lightCube);
        for (let li = 0; li < 5; li++) {
            const p = this.startLights[li];
            gl.uniform4f(L.uOverride, li < lit ? 1.0 : 0.16, 0.03, 0.03, 1);
            gl.uniformMatrix4fv(L.uModel, false, M4.trs(p[0], p[1], p[2],
                -Math.atan2(this.cir.at(2).ty, this.cir.at(2).tx), 0));
            gl.drawArrays(gl.TRIANGLES, 0, this.lightCube.n);
        }
        gl.uniform4f(L.uOverride, 0, 0, 0, 0);

        // cars: body with specular paint + four spinning wheels
        const carPose = c => {
            const ch2 = this.hAt(c.idx);
            const slope = (this.hAt(c.idx + 2) - this.hAt(c.idx - 2)) / (4 * this.cir.ds);
            return { mdl: M4.trs(c.x, ch2 + 0.05, c.y, -c.heading, Math.atan(slope) * 0.8), h: ch2 };
        };
        for (const c of session.cars) {
            if (mode === 'cockpit' && c === car) continue;
            const { mdl } = carPose(c);
            const mesh = this.carMeshes[c.short] || Object.values(this.carMeshes)[0];
            if (!mesh) continue;
            gl.uniform1f(L.uSpec, 1);
            this._bind(mesh);
            gl.uniformMatrix4fv(L.uModel, false, mdl);
            gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
            gl.uniform1f(L.uSpec, 0.3);
            const spin = -(c.wheelAng || 0), steer = (c.steerS || 0) * 0.32;
            for (const wp of WHEEL_POS) {
                const wm = wp.front
                    ? M4.mul(mdl, M4.mul(M4.T(wp.x, wp.y, wp.z), M4.mul(M4.rotY(-steer), M4.rotZ(spin))))
                    : M4.mul(mdl, M4.mul(M4.T(wp.x, wp.y, wp.z), M4.rotZ(spin)));
                const wmesh = wp.front ? this.wheelF : this.wheelR;
                this._bind(wmesh);
                gl.uniformMatrix4fv(L.uModel, false, wm);
                gl.drawArrays(gl.TRIANGLES, 0, wmesh.n);
            }
        }
        gl.uniform1f(L.uSpec, 0);

        // planar projected shadows (car silhouette squashed along sunlight)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.uniform1f(L.uAlpha, 0.34);
        gl.uniform4f(L.uOverride, 0.02, 0.02, 0.04, 1);
        for (const c of session.cars) {
            if (mode === 'cockpit' && c === car) continue;
            const { mdl, h } = carPose(c);
            const flat = M4.mul(M4.flatten(h, this.LIGHT), mdl);
            const mesh = this.carMeshes[c.short] || Object.values(this.carMeshes)[0];
            if (!mesh) continue;
            this._bind(mesh);
            gl.uniformMatrix4fv(L.uModel, false, flat);
            gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
        }
        gl.uniform4f(L.uOverride, 0, 0, 0, 0);
        gl.uniform1f(L.uAlpha, 1.0);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.disable(gl.SCISSOR_TEST);
    }
}

globalThis.GLView = GLView;

} /* end browser guard */
