// Particle System - smoke, sparks, rain effects
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 800;
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.vx *= p.drag;
            p.vy *= p.drag;
            p.life -= dt;
            p.alpha = p.life / p.maxLife;

            if (p.type === 'smoke') {
                p.size += p.growRate * dt * 60;
                p.vy -= 0.02 * dt * 60; // smoke rises
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    emit(type, x, y, count, options) {
        if (this.particles.length >= this.maxParticles) {
            // Remove oldest particles
            this.particles.splice(0, count);
        }

        for (let i = 0; i < count; i++) {
            const p = this._createParticle(type, x, y, options);
            if (p) this.particles.push(p);
        }
    }

    _createParticle(type, x, y, options) {
        const o = options || {};
        switch (type) {
            case 'smoke':
                return {
                    type: 'smoke',
                    x: x + Utils.random(-3, 3),
                    y: y + Utils.random(-3, 3),
                    vx: Utils.random(-0.5, 0.5) + (o.vx || 0) * 0.1,
                    vy: Utils.random(-0.5, 0) + (o.vy || 0) * 0.1,
                    size: Utils.random(3, 8),
                    growRate: Utils.random(0.1, 0.3),
                    color: o.color || '#cccccc',
                    alpha: 0.6,
                    maxLife: Utils.random(0.5, 1.2),
                    life: Utils.random(0.5, 1.2),
                    drag: 0.97
                };

            case 'spark':
                return {
                    type: 'spark',
                    x: x,
                    y: y,
                    vx: Utils.random(-3, 3) + (o.vx || 0) * 0.05,
                    vy: Utils.random(-4, -1) + (o.vy || 0) * 0.05,
                    size: Utils.random(1, 3),
                    growRate: 0,
                    color: `hsl(${Utils.random(20, 60)}, 100%, ${Utils.random(60, 100)}%)`,
                    alpha: 1,
                    maxLife: Utils.random(0.2, 0.6),
                    life: Utils.random(0.2, 0.6),
                    drag: 0.92
                };

            case 'dust':
                return {
                    type: 'dust',
                    x: x + Utils.random(-5, 5),
                    y: y + Utils.random(-5, 5),
                    vx: Utils.random(-1, 1) + (o.vx || 0) * 0.05,
                    vy: Utils.random(-0.5, 0),
                    size: Utils.random(2, 6),
                    growRate: 0.05,
                    color: '#a0824a',
                    alpha: 0.4,
                    maxLife: Utils.random(0.8, 1.5),
                    life: Utils.random(0.8, 1.5),
                    drag: 0.96
                };

            case 'debris':
                return {
                    type: 'debris',
                    x: x,
                    y: y,
                    vx: Utils.random(-5, 5) + (o.vx || 0) * 0.2,
                    vy: Utils.random(-5, 5) + (o.vy || 0) * 0.2,
                    size: Utils.random(1, 4),
                    growRate: 0,
                    color: Utils.random(0, 1) > 0.5 ? '#888888' : '#cc4400',
                    alpha: 1,
                    maxLife: Utils.random(0.5, 1.5),
                    life: Utils.random(0.5, 1.5),
                    drag: 0.95
                };

            case 'water_spray':
                return {
                    type: 'water_spray',
                    x: x + Utils.random(-2, 2),
                    y: y,
                    vx: Utils.random(-1.5, 1.5) + (o.vx || 0) * 0.08,
                    vy: Utils.random(-2, 0) + (o.vy || 0) * 0.08,
                    size: Utils.random(2, 5),
                    growRate: 0.08,
                    color: 'rgba(180, 210, 255, 0.7)',
                    alpha: 0.5,
                    maxLife: Utils.random(0.4, 0.9),
                    life: Utils.random(0.4, 0.9),
                    drag: 0.93
                };

            default:
                return null;
        }
    }

    // Emit tire smoke when wheel spinning
    emitTireSmoke(car) {
        if (car.wheelSpin && car.speed > 5) {
            const intensity = Math.min(3, car.speed * 0.05);
            const cosA = Math.cos(car.angle);
            const sinA = Math.sin(car.angle);
            // Rear wheels
            const rwx = car.x - cosA * 2.5;
            const rwy = car.y - sinA * 2.5;
            this.emit('smoke', rwx - sinA * 0.8, rwy + cosA * 0.8, Math.ceil(intensity), {
                color: '#e8e8e8', vx: car.vx, vy: car.vy
            });
            this.emit('smoke', rwx + sinA * 0.8, rwy - cosA * 0.8, Math.ceil(intensity), {
                color: '#e8e8e8', vx: car.vx, vy: car.vy
            });
        }
    }

    // Emit brake smoke on lockup
    emitBrakeSmoke(car) {
        if (car.lockup && car.speed > 10) {
            const cosA = Math.cos(car.angle);
            const sinA = Math.sin(car.angle);
            const fwx = car.x + cosA * 2.0;
            const fwy = car.y + sinA * 2.0;
            this.emit('smoke', fwx - sinA * 0.7, fwy + cosA * 0.7, 2, {
                color: '#cccccc', vx: car.vx * 0.5, vy: car.vy * 0.5
            });
        }
    }

    // Emit sparks on kerbs
    emitKerbSparks(car) {
        if (car.lateralG > 2.5 && car.speed > 20) {
            this.emit('spark', car.x, car.y, Math.ceil(car.lateralG), {
                vx: car.vx, vy: car.vy
            });
        }
    }

    // Water spray in rain
    emitWaterSpray(car, rainIntensity) {
        if (rainIntensity > 0.1 && car.speed > 20) {
            const cosA = Math.cos(car.angle);
            const sinA = Math.sin(car.angle);
            const rx = car.x - cosA * 2.5;
            const ry = car.y - sinA * 2.5;
            const count = Math.ceil(rainIntensity * car.speed * 0.05);
            this.emit('water_spray', rx, ry, count, {
                vx: -car.vx * 0.3, vy: -car.vy * 0.3
            });
        }
    }

    // Collision debris
    emitCollisionDebris(x, y, vx, vy) {
        this.emit('debris', x, y, 12, { vx, vy });
        this.emit('smoke', x, y, 8, { vx: vx * 0.3, vy: vy * 0.3 });
        this.emit('spark', x, y, 6, { vx, vy });
    }

    draw(ctx, cameraX, cameraY, scale) {
        ctx.save();
        for (const p of this.particles) {
            const screenX = (p.x - cameraX) * scale + CONFIG.CANVAS_WIDTH / 2;
            const screenY = (p.y - cameraY) * scale + CONFIG.CANVAS_HEIGHT / 2;

            // Skip if off screen
            if (screenX < -50 || screenX > CONFIG.CANVAS_WIDTH + 50 ||
                screenY < -50 || screenY > CONFIG.CANVAS_HEIGHT + 50) continue;

            const s = p.size * scale;

            if (p.type === 'smoke') {
                ctx.globalAlpha = p.alpha * 0.5;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(screenX, screenY, s, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'spark') {
                ctx.globalAlpha = p.alpha;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = s * 0.5;
                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(screenX - p.vx * 3, screenY - p.vy * 3);
                ctx.stroke();
            } else if (p.type === 'water_spray') {
                ctx.globalAlpha = p.alpha * 0.6;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.ellipse(screenX, screenY, s, s * 1.5, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(screenX, screenY, Math.max(1, s), 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    drawRain(ctx, rainDrops, alpha) {
        if (rainDrops.length === 0) return;
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = '#aaccff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const drop of rainDrops) {
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x + drop.vx * 2, drop.y + drop.vy * 2);
        }
        ctx.stroke();
        ctx.restore();
    }
}
