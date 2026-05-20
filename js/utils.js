// Math and utility functions
const Utils = {
    // Linear interpolation
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    // Clamp value between min and max
    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    // Map value from one range to another
    map(val, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((val - inMin) / (inMax - inMin));
    },

    // Distance between two points
    dist(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Distance squared (faster, no sqrt)
    distSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    // Normalize angle to [-PI, PI]
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    },

    // Get angle from point1 to point2
    angleTo(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    // Rotate a point around origin
    rotatePoint(x, y, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos
        };
    },

    // Dot product of two 2D vectors
    dot(ax, ay, bx, by) {
        return ax * bx + ay * by;
    },

    // Cross product (z component) of two 2D vectors
    cross(ax, ay, bx, by) {
        return ax * by - ay * bx;
    },

    // Normalize a 2D vector
    normalize(x, y) {
        const len = Math.sqrt(x * x + y * y);
        if (len === 0) return { x: 0, y: 0 };
        return { x: x / len, y: y / len };
    },

    // Vector length
    length(x, y) {
        return Math.sqrt(x * x + y * y);
    },

    // Random number between min and max
    random(min, max) {
        return min + Math.random() * (max - min);
    },

    // Random integer between min and max (inclusive)
    randomInt(min, max) {
        return Math.floor(min + Math.random() * (max - min + 1));
    },

    // Format time in MM:SS.mmm
    formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '--:--.---';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(mins).padStart(1, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    },

    // Format gap time
    formatGap(seconds) {
        if (seconds < 0) return '+' + this.formatGap(-seconds);
        if (seconds < 60) return '+' + seconds.toFixed(3) + 's';
        return '+1 lap';
    },

    // Cubic bezier point
    cubicBezier(p0, p1, p2, p3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        return {
            x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
            y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
        };
    },

    // Get point on catmull-rom spline
    catmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        return {
            x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
            y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        };
    },

    // Smooth step interpolation
    smoothStep(t) {
        return t * t * (3 - 2 * t);
    },

    // Generate points along a path from control points
    generatePathPoints(controlPoints, segmentsPerSection = 20) {
        const points = [];
        const n = controlPoints.length;
        for (let i = 0; i < n; i++) {
            const p0 = controlPoints[(i - 1 + n) % n];
            const p1 = controlPoints[i];
            const p2 = controlPoints[(i + 1) % n];
            const p3 = controlPoints[(i + 2) % n];
            for (let j = 0; j < segmentsPerSection; j++) {
                const t = j / segmentsPerSection;
                const pt = this.catmullRom(p0, p1, p2, p3, t);
                // Interpolate width and properties
                const w = this.lerp(p1.width || 12, p2.width || 12, t);
                points.push({
                    x: pt.x,
                    y: pt.y,
                    width: w,
                    drs: p1.drs || false,
                    kerb: p1.kerb || false,
                    sector: p1.sector || 1
                });
            }
        }
        return points;
    },

    // Find closest point on path to a position
    closestPointOnPath(pathPoints, px, py) {
        let minDist = Infinity;
        let minIndex = 0;
        for (let i = 0; i < pathPoints.length; i++) {
            const d = this.distSq(px, py, pathPoints[i].x, pathPoints[i].y);
            if (d < minDist) {
                minDist = d;
                minIndex = i;
            }
        }
        return { index: minIndex, dist: Math.sqrt(minDist) };
    },

    // Interpolate angle with shortest path
    lerpAngle(a, b, t) {
        const diff = this.normalizeAngle(b - a);
        return a + diff * t;
    },

    // Check if point is inside rectangle
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },

    // Ease in out cubic
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },

    // Convert m/s to km/h
    msToKmh(ms) {
        return ms * 3.6;
    },

    // Convert km/h to m/s
    kmhToMs(kmh) {
        return kmh / 3.6;
    },

    // Pacejka magic formula (simplified)
    pacejka(slipAngle, B, C, D, E) {
        const x = slipAngle;
        return D * Math.sin(C * Math.atan(B * x - E * (B * x - Math.atan(B * x))));
    },

    // Generate a color from HSL
    hsl(h, s, l) {
        return `hsl(${h}, ${s}%, ${l}%)`;
    },

    // Hex to RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    // Pad a string with zeros
    zeroPad(n, width) {
        return String(n).padStart(width, '0');
    },

    // Sign of a number
    sign(n) {
        return n > 0 ? 1 : n < 0 ? -1 : 0;
    },

    // Angle difference in degrees
    angleDiffDeg(a, b) {
        let diff = b - a;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return diff;
    }
};
