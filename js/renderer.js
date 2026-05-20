// Canvas 2D Renderer
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = CONFIG.CANVAS_WIDTH;
        this.height = CONFIG.CANVAS_HEIGHT;

        // Camera state
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraScale = 1.0;
        this.targetCameraX = 0;
        this.targetCameraY = 0;
        this.targetScale = 1.0;

        // Motion blur
        this.motionBlurAlpha = 0;

        // Pre-rendered track cache
        this.trackCache = null;
        this.trackCacheCanvas = null;
        this.trackCacheCtx = null;
    }

    // Set camera to follow a car
    followCar(car, dt) {
        // Camera offset: look ahead of the car
        const cosA = Math.cos(car.angle);
        const sinA = Math.sin(car.angle);
        const aheadDist = 80 + car.speed * 0.8;

        this.targetCameraX = car.x + cosA * aheadDist * 0.3;
        this.targetCameraY = car.y + sinA * aheadDist * 0.3;

        // Scale based on speed
        this.targetScale = Utils.clamp(1.8 - car.speed * 0.006, 0.8, 1.8);

        // Smooth camera
        const lerp = CONFIG.CAMERA_LERP;
        this.cameraX = Utils.lerp(this.cameraX, this.targetCameraX, lerp);
        this.cameraY = Utils.lerp(this.cameraY, this.targetCameraY, lerp);
        this.cameraScale = Utils.lerp(this.cameraScale, this.targetScale, lerp * 0.5);
    }

    // Transform world coordinates to screen coordinates
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.cameraX) * this.cameraScale + this.width / 2,
            y: (wy - this.cameraY) * this.cameraScale + this.height / 2
        };
    }

    // Set camera to overview (for mini-map or menu)
    setOverviewCamera(track) {
        const b = track.bounds;
        const cx = (b.minX + b.maxX) / 2;
        const cy = (b.minY + b.maxY) / 2;
        const scaleX = (this.width * 0.8) / (b.maxX - b.minX);
        const scaleY = (this.height * 0.8) / (b.maxY - b.minY);
        this.cameraX = cx;
        this.cameraY = cy;
        this.cameraScale = Math.min(scaleX, scaleY);
    }

    clear() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // Pre-render track to offscreen canvas for performance
    prerenderTrack(track, weatherSystem) {
        if (!this.trackCacheCanvas) {
            this.trackCacheCanvas = document.createElement('canvas');
            this.trackCacheCanvas.width = this.width * 2;
            this.trackCacheCanvas.height = this.height * 2;
            this.trackCacheCtx = this.trackCacheCanvas.getContext('2d');
        }

        // Track cache needs full redraw
        this.trackCache = null;
    }

    drawBackground(track) {
        const ctx = this.ctx;
        // Draw off-track surface
        ctx.fillStyle = track.data.background || '#1a2a1a';
        ctx.fillRect(0, 0, this.width, this.height);
    }

    drawTrack(track, weatherSystem) {
        const ctx = this.ctx;
        const points = track.pathPoints;
        const n = points.length;
        const s = this.cameraScale;
        const cx = this.cameraX;
        const cy = this.cameraY;
        const hw = this.width / 2;
        const hh = this.height / 2;

        const toScreen = (x, y) => ({
            x: (x - cx) * s + hw,
            y: (y - cy) * s + hh
        });

        // Draw run-off areas (wider lighter gray)
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 0;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const p = points[i];
            const sc = toScreen(p.x, p.y);
            if (i === 0) ctx.moveTo(sc.x, sc.y);
            else ctx.lineTo(sc.x, sc.y);
        }
        ctx.closePath();

        // Draw run-off as wide stroke
        for (let i = 0; i < n; i++) {
            const p = points[i];
            const next = points[(i + 1) % n];
            const sc1 = toScreen(p.x, p.y);
            const sc2 = toScreen(next.x, next.y);
            const w = (p.width * 2.5) * s;

            ctx.strokeStyle = '#2a2a22';
            ctx.lineWidth = w;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sc1.x, sc1.y);
            ctx.lineTo(sc2.x, sc2.y);
            ctx.stroke();
        }

        // Draw track surface - main asphalt
        for (let i = 0; i < n; i++) {
            const p = points[i];
            const next = points[(i + 1) % n];
            const sc1 = toScreen(p.x, p.y);
            const sc2 = toScreen(next.x, next.y);
            const w = p.width * s;

            // Wet track darkening
            let trackColor = '#1a1a1a';
            if (weatherSystem && weatherSystem.trackWetness > 0.1) {
                const wetness = weatherSystem.trackWetness;
                const gray = Math.floor(26 - wetness * 10);
                const blue = Math.floor(26 + wetness * 40);
                trackColor = `rgb(${gray}, ${gray}, ${blue})`;
            }

            ctx.strokeStyle = trackColor;
            ctx.lineWidth = w;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sc1.x, sc1.y);
            ctx.lineTo(sc2.x, sc2.y);
            ctx.stroke();
        }

        // Draw track edge lines
        for (let i = 0; i < n; i++) {
            const p = points[i];
            const next = points[(i + 1) % n];
            const normal = track.normals[i];
            if (!normal) continue;

            const halfW = p.width * 0.5;

            const sc1L = toScreen(p.x + normal.nx * halfW, p.y + normal.ny * halfW);
            const sc2L = toScreen(next.x + normal.nx * halfW, next.y + normal.ny * halfW);
            const sc1R = toScreen(p.x - normal.nx * halfW, p.y - normal.ny * halfW);
            const sc2R = toScreen(next.x - normal.nx * halfW, next.y - normal.ny * halfW);

            // White edge lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.5 * s;
            ctx.lineCap = 'butt';

            // Left edge
            ctx.beginPath();
            ctx.moveTo(sc1L.x, sc1L.y);
            ctx.lineTo(sc2L.x, sc2L.y);
            ctx.stroke();

            // Right edge
            ctx.beginPath();
            ctx.moveTo(sc1R.x, sc1R.y);
            ctx.lineTo(sc2R.x, sc2R.y);
            ctx.stroke();

            // Kerb coloring
            if (p.kerb) {
                // Red/white kerb strips
                const stripW = 3 * s;
                const idx = Math.floor(i / 5);
                const kerbColor = idx % 2 === 0 ? '#cc1111' : '#eeeeee';

                ctx.strokeStyle = kerbColor;
                ctx.lineWidth = stripW;

                const kerbOffset = halfW + 2;
                const ks1L = toScreen(p.x + normal.nx * kerbOffset, p.y + normal.ny * kerbOffset);
                const ks2L = toScreen(next.x + normal.nx * kerbOffset, next.y + normal.ny * kerbOffset);
                ctx.beginPath();
                ctx.moveTo(ks1L.x, ks1L.y);
                ctx.lineTo(ks2L.x, ks2L.y);
                ctx.stroke();

                const ks1R = toScreen(p.x - normal.nx * kerbOffset, p.y - normal.ny * kerbOffset);
                const ks2R = toScreen(next.x - normal.nx * kerbOffset, next.y - normal.ny * kerbOffset);
                ctx.beginPath();
                ctx.moveTo(ks1R.x, ks1R.y);
                ctx.lineTo(ks2R.x, ks2R.y);
                ctx.stroke();
            }
        }

        // Draw start/finish line
        this._drawStartFinishLine(track);

        // Draw DRS zones
        this._drawDRSZones(track);
    }

    _drawStartFinishLine(track) {
        const ctx = this.ctx;
        const s = this.cameraScale;
        const p = track.pathPoints[0];
        const normal = track.normals[0];
        if (!p || !normal) return;

        const halfW = p.width * 0.5;
        const sp1 = this.worldToScreen(p.x + normal.nx * halfW, p.y + normal.ny * halfW);
        const sp2 = this.worldToScreen(p.x - normal.nx * halfW, p.y - normal.ny * halfW);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.moveTo(sp1.x, sp1.y);
        ctx.lineTo(sp2.x, sp2.y);
        ctx.stroke();

        // Checkered pattern
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5 * s;
        const steps = 6;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const bx = Utils.lerp(sp1.x, sp2.x, t);
            const by = Utils.lerp(sp1.y, sp2.y, t);
            const ex = Utils.lerp(sp1.x, sp2.x, t + 0.5/steps);
            const ey = Utils.lerp(sp1.y, sp2.y, t + 0.5/steps);
            if (i % 2 === 0) {
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(ex, ey);
                ctx.stroke();
            }
        }
    }

    _drawDRSZones(track) {
        const ctx = this.ctx;
        const s = this.cameraScale;
        const n = track.pathPoints.length;

        for (const zone of track.drsZones) {
            let start = zone.startIdx;
            let end = zone.endIdx;
            if (end < start) end += n;

            for (let i = start; i <= end; i++) {
                const idx = i % n;
                const p = track.pathPoints[idx];
                const next = track.pathPoints[(idx + 1) % n];
                const normal = track.normals[idx];
                if (!normal) continue;

                const halfW = p.width * 0.5;
                const sc1 = this.worldToScreen(p.x, p.y);
                const sc2 = this.worldToScreen(next.x, next.y);

                ctx.strokeStyle = 'rgba(0, 200, 80, 0.3)';
                ctx.lineWidth = p.width * s;
                ctx.beginPath();
                ctx.moveTo(sc1.x, sc1.y);
                ctx.lineTo(sc2.x, sc2.y);
                ctx.stroke();
            }
        }
    }

    drawCar(car) {
        const ctx = this.ctx;
        const sc = this.worldToScreen(car.x, car.y);
        const s = this.cameraScale;

        ctx.save();
        ctx.translate(sc.x, sc.y);
        ctx.rotate(car.angle);

        const carScale = s * 1.2;

        // Car body dimensions (in pixels at scale)
        const bodyLen = 4.5 * carScale;
        const bodyWid = 1.8 * carScale;
        const noseLen = 2.2 * carScale;
        const noseWid = 0.6 * carScale;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(2 * carScale, 2 * carScale, bodyLen * 0.6, bodyWid * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Front wing
        ctx.fillStyle = car.secondaryColor;
        ctx.fillRect(bodyLen * 0.5 - 1, -bodyWid * 0.75, 3 * carScale, bodyWid * 1.5);

        // Rear wing
        ctx.fillStyle = car.primaryColor;
        ctx.fillRect(-bodyLen * 0.52, -bodyWid * 0.85, 3 * carScale, bodyWid * 1.7);

        // DRS indicator on rear wing
        if (car.drsActive) {
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(-bodyLen * 0.52, -bodyWid * 0.85, 3 * carScale, 1.5 * carScale);
        }

        // Main body - primary color
        ctx.fillStyle = car.primaryColor;
        const bodyPath = new Path2D();
        bodyPath.moveTo(-bodyLen * 0.5, -bodyWid * 0.35);
        bodyPath.lineTo(bodyLen * 0.45, -bodyWid * 0.35);
        bodyPath.lineTo(bodyLen * 0.45 + noseLen, -noseWid * 0.5);
        bodyPath.lineTo(bodyLen * 0.45 + noseLen, noseWid * 0.5);
        bodyPath.lineTo(bodyLen * 0.45, bodyWid * 0.35);
        bodyPath.lineTo(-bodyLen * 0.5, bodyWid * 0.35);
        bodyPath.closePath();
        ctx.fill(bodyPath);

        // Secondary color side pods
        ctx.fillStyle = car.secondaryColor;
        ctx.fillRect(-bodyLen * 0.1, -bodyWid * 0.5, bodyLen * 0.4, bodyWid * 0.15);
        ctx.fillRect(-bodyLen * 0.1, bodyWid * 0.35, bodyLen * 0.4, bodyWid * 0.15);

        // Cockpit
        ctx.fillStyle = '#111111';
        const cockpitPath = new Path2D();
        cockpitPath.ellipse(bodyLen * 0.1, 0, bodyLen * 0.12, bodyWid * 0.22, 0, 0, Math.PI * 2);
        ctx.fill(cockpitPath);

        // Halo
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
        ctx.lineWidth = 1.5 * carScale;
        ctx.beginPath();
        ctx.ellipse(bodyLen * 0.1, 0, bodyLen * 0.14, bodyWid * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Wheels
        this._drawWheels(ctx, car, bodyLen, bodyWid, carScale);

        // Driver number
        if (carScale > 0.5) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(6, 7 * carScale)}px 'Formula1', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(car.driverNumber || '0', bodyLen * 0.1, 0);
        }

        // ERS glow effect
        if (car.ersDeploying) {
            ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)';
            ctx.lineWidth = 3 * carScale;
            ctx.beginPath();
            ctx.ellipse(0, 0, bodyLen * 0.55, bodyWid * 0.6, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // Car name label (for AI cars)
        if (!car.isPlayer && carScale > 0.3) {
            const labelX = sc.x;
            const labelY = sc.y - bodyWid * carScale * 2;
            ctx.save();
            ctx.font = `${Math.max(8, 9 * carScale)}px 'Formula1', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = car.primaryColor;
            ctx.globalAlpha = 0.9;
            ctx.fillText(car.driverName.substring(0, 3).toUpperCase(), labelX, labelY);
            ctx.restore();
        }
    }

    _drawWheels(ctx, car, bodyLen, bodyWid, carScale) {
        const wheelW = 1.6 * carScale;
        const wheelH = 0.9 * carScale;
        const tireColor = '#222222';
        const rimColor = '#888888';

        // Wheel spin rotation
        const wheelRot = car.speed * 0.1;

        const drawWheel = (x, y, steering) => {
            ctx.save();
            ctx.translate(x, y);
            if (steering) ctx.rotate(steering * 0.3);

            // Tire
            ctx.fillStyle = tireColor;
            ctx.fillRect(-wheelW / 2, -wheelH * 1.2, wheelW, wheelH * 2.4);

            // Rim
            ctx.fillStyle = rimColor;
            ctx.beginPath();
            ctx.arc(0, 0, wheelH * 0.8, 0, Math.PI * 2);
            ctx.fill();

            // Wheel details
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const a = (i / 5) * Math.PI * 2 + wheelRot;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * wheelH * 0.7, Math.sin(a) * wheelH * 0.7);
                ctx.stroke();
            }

            ctx.restore();
        };

        const steerAngle = (car._aiInputs ? car._aiInputs.steer : 0) * 0.25;

        // Front wheels
        drawWheel(bodyLen * 0.38, -bodyWid * 0.55, steerAngle);
        drawWheel(bodyLen * 0.38, bodyWid * 0.55, steerAngle);
        // Rear wheels
        drawWheel(-bodyLen * 0.28, -bodyWid * 0.55, 0);
        drawWheel(-bodyLen * 0.28, bodyWid * 0.55, 0);
    }

    drawMotionBlur(car) {
        if (car.speed < 40) return;
        const ctx = this.ctx;
        const sc = this.worldToScreen(car.x, car.y);

        // Motion streak
        const blurLen = car.speed * 0.15 * this.cameraScale;
        const cosA = Math.cos(car.angle + Math.PI);
        const sinA = Math.sin(car.angle + Math.PI);

        const grad = ctx.createLinearGradient(sc.x, sc.y, sc.x + cosA * blurLen, sc.y + sinA * blurLen);
        grad.addColorStop(0, `rgba(${this._hexToRgbStr(car.primaryColor)}, 0.3)`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(Math.min(sc.x, sc.x + cosA * blurLen) - 5, Math.min(sc.y, sc.y + sinA * blurLen) - 5,
                     Math.abs(cosA * blurLen) + 10, Math.abs(sinA * blurLen) + 10);
        ctx.restore();
    }

    _hexToRgbStr(hex) {
        const r = Utils.hexToRgb(hex);
        return `${r.r}, ${r.g}, ${r.b}`;
    }

    drawSpeedEffect(car) {
        if (car.speed < 50) return;
        const ctx = this.ctx;
        const speedRatio = Utils.clamp((car.speed - 50) / 50, 0, 1);

        // Vignette effect at high speed
        const grad = ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.height * 0.3,
            this.width / 2, this.height / 2, this.height * 0.8
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${speedRatio * 0.4})`);

        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
    }
}
