// Race HUD - overlays, timing, standings, mini-map
class HUD {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = CONFIG.CANVAS_WIDTH;
        this.height = CONFIG.CANVAS_HEIGHT;

        // Message queue
        this.messages = [];

        // Sector time flash
        this.sectorFlash = null;
        this.sectorFlashTimer = 0;

        // Lap time comparison
        this.lastSectorComparison = null;
    }

    draw(gameState) {
        const { cars, playerCar, track, weather, raceTime, totalLaps } = gameState;
        if (!playerCar) return;

        const ctx = this.ctx;

        // Draw all HUD elements
        this._drawTopBar(playerCar, raceTime, totalLaps);
        this._drawSpeedAndGear(playerCar);
        this._drawTireStatus(playerCar);
        this._drawERSBar(playerCar);
        this._drawFuelGauge(playerCar);
        this._drawDRSIndicator(playerCar);
        this._drawRPMBar(playerCar);
        this._drawTimingTower(cars, playerCar);
        this._drawMiniMap(track, cars, playerCar);
        this._drawWeatherIndicator(weather);
        this._drawMessages();
        this._drawSectorFlash();

        if (playerCar.inPitLane) {
            this._drawPitLaneMessage(playerCar);
        }

        // 2nd player HUD if multiplayer local
        const player2 = cars.find(c => c.isPlayer && c.playerIndex === 1);
        if (player2) {
            this._drawPlayer2Speed(player2);
        }
    }

    _drawTopBar(car, raceTime, totalLaps) {
        const ctx = this.ctx;

        // Background bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, this.width, 52);

        // Position indicator
        ctx.fillStyle = '#e10600';
        ctx.fillRect(0, 0, 55, 52);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P' + car.racePosition, 27, 26);

        // Lap counter
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Formula1, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`LAP ${car.currentLap} / ${totalLaps}`, 65, 18);

        // Race time
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '13px Formula1, monospace';
        ctx.fillText(Utils.formatTime(raceTime), 65, 38);

        // Current lap time (center)
        ctx.font = 'bold 22px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(Utils.formatTime(car.lapTime), this.width / 2, 26);

        // Last lap time
        if (car.lastLapTime > 0) {
            ctx.font = '12px Formula1, monospace';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText('LAST: ' + Utils.formatTime(car.lastLapTime), this.width / 2, 44);
        }

        // Best lap time (right side)
        ctx.textAlign = 'right';
        ctx.font = '13px Formula1, monospace';
        ctx.fillStyle = '#cc44ff';
        if (car.bestLapTime < Infinity) {
            ctx.fillText('BEST: ' + Utils.formatTime(car.bestLapTime), this.width - 10, 18);
        }

        // Gap to car ahead
        if (car.gapAhead > 0) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '13px Formula1, monospace';
            ctx.fillText('GAP: +' + car.gapAhead.toFixed(3) + 's', this.width - 10, 38);
        }

        // Sector indicators
        this._drawSectorIndicators(car);
    }

    _drawSectorIndicators(car) {
        const ctx = this.ctx;
        const sectors = [1, 2, 3];
        const colors = ['#ffffff', '#ffffff', '#ffffff'];

        // Color sectors based on performance
        for (let i = 0; i < 3; i++) {
            if (car.currentSector > i + 1) {
                // Completed sector - compare to best
                const sectorTime = car.sectorTimes[i];
                const bestSector = car.bestSectorTimes[i];
                colors[i] = sectorTime <= bestSector ? '#cc44ff' : '#ffff00';
            } else if (car.currentSector === i + 1) {
                colors[i] = '#ffffff'; // Current sector
            } else {
                colors[i] = '#444444'; // Not yet reached
            }
        }

        const sectorW = 60;
        const startX = this.width / 2 - sectorW * 1.5;
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = colors[i];
            ctx.fillRect(startX + i * (sectorW + 4), this.height * 0, sectorW, 3);
        }
    }

    _drawSpeedAndGear(car) {
        const ctx = this.ctx;
        const x = this.width / 2;
        const y = this.height - 10;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x - 120, y - 75, 240, 80, 10);
        ctx.fill();

        // Speed
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(Math.round(car.speedKmh), x, y - 10);

        ctx.font = '12px Formula1, monospace';
        ctx.fillStyle = '#888888';
        ctx.fillText('km/h', x, y - 2);

        // Gear (left of speed)
        ctx.fillStyle = '#e10600';
        ctx.font = 'bold 42px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(car.gear, x - 85, y - 8);

        ctx.fillStyle = '#888888';
        ctx.font = '11px Formula1, monospace';
        ctx.fillText('GEAR', x - 85, y - 2);
    }

    _drawRPMBar(car) {
        const ctx = this.ctx;
        const x = this.width / 2 - 150;
        const y = this.height - 12;
        const barW = 300;
        const barH = 8;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barW, barH);

        const rpmRatio = (car.rpm - CONFIG.MIN_RPM) / (CONFIG.MAX_RPM - CONFIG.MIN_RPM);

        // RPM bar color gradient
        let barColor;
        if (rpmRatio > 0.85) barColor = '#ff2200'; // redline
        else if (rpmRatio > 0.7) barColor = '#ffaa00'; // near redline
        else barColor = '#00aaff'; // normal

        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barW * rpmRatio, barH);

        // Gear change light indicators
        const shifts = [0.65, 0.75, 0.85, 0.92, 0.96, 1.0];
        for (let i = 0; i < shifts.length; i++) {
            const dotX = x + barW * shifts[i];
            ctx.fillStyle = rpmRatio >= shifts[i] ? '#ffffff' : '#333333';
            ctx.beginPath();
            ctx.arc(dotX, y + barH / 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawTireStatus(car) {
        const ctx = this.ctx;
        const x = 10;
        const y = 80;
        const compound = CONFIG.TIRE_COMPOUNDS[car.tireCompound];

        // Background panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(x, y, 110, 130, 8);
        ctx.fill();

        // Compound label
        ctx.fillStyle = compound.color;
        ctx.font = 'bold 13px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(compound.name, x + 55, y + 6);

        // Tire diagram (4 corners)
        const positions = [
            { label: 'FL', wx: 0, wy: 0, tireIdx: 0 },
            { label: 'FR', wx: 1, wy: 0, tireIdx: 1 },
            { label: 'RL', wx: 0, wy: 1, tireIdx: 2 },
            { label: 'RR', wx: 1, wy: 1, tireIdx: 3 }
        ];

        for (const pos of positions) {
            const tx = x + 15 + pos.wx * 55;
            const ty = y + 28 + pos.wy * 55;
            const wear = car.tireWear[pos.tireIdx];
            const temp = car.tireTemp[pos.tireIdx];

            // Tire wear color
            let wearColor;
            if (wear < 0.3) wearColor = '#00ff44';
            else if (wear < 0.6) wearColor = '#ffaa00';
            else if (wear < 0.8) wearColor = '#ff6600';
            else wearColor = '#ff0000';

            // Temperature-based opacity
            const tempOpt = compound.optimalTemp;
            const tempDiff = Math.abs(temp - tempOpt);
            const tempGlow = Math.max(0, 1 - tempDiff / 30);

            // Tire circle
            ctx.fillStyle = wearColor;
            ctx.globalAlpha = 0.3 + tempGlow * 0.5;
            ctx.beginPath();
            ctx.arc(tx + 15, ty + 15, 15, 0, Math.PI * 2);
            ctx.fill();

            // Wear outline
            ctx.globalAlpha = 1;
            ctx.strokeStyle = wearColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tx + 15, ty + 15, 15, -Math.PI / 2, -Math.PI / 2 + (1 - wear) * Math.PI * 2);
            ctx.stroke();

            // Tire label
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 1;
            ctx.font = '9px Formula1, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pos.label, tx + 15, ty + 15);

            // Wear percentage
            ctx.fillStyle = '#888888';
            ctx.font = '8px Formula1, monospace';
            ctx.fillText(Math.round(wear * 100) + '%', tx + 15, ty + 32);
        }

        // Temperature indicator
        const avgTemp = car.getAverageTireTemp ? car.getAverageTireTemp() : 80;
        const tempColor = avgTemp > compound.optimalTemp + 15 ? '#ff4400' :
                          avgTemp < compound.optimalTemp - 20 ? '#4488ff' : '#00ff44';
        ctx.fillStyle = tempColor;
        ctx.font = '10px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(avgTemp) + '°C', x + 55, y + 118);
    }

    _drawERSBar(car) {
        const ctx = this.ctx;
        const x = this.width - 18;
        const y = 80;
        const barH = 120;
        const barW = 14;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(x - barW - 4, y - 4, barW + 8, barH + 30, 6);
        ctx.fill();

        // ERS label
        ctx.fillStyle = '#0088ff';
        ctx.font = 'bold 9px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('ERS', x - barW / 2 - 4 + barW / 2, y - 1);

        // Bar background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - barW, y + 12, barW, barH);

        // ERS level
        const ersRatio = car.ersEnergy / CONFIG.ERS_MAX_ENERGY;
        const barFill = barH * ersRatio;

        const ersGrad = ctx.createLinearGradient(0, y + 12 + barH, 0, y + 12);
        ersGrad.addColorStop(0, '#003399');
        ersGrad.addColorStop(0.5, '#0066ff');
        ersGrad.addColorStop(1, '#00aaff');

        ctx.fillStyle = ersGrad;
        ctx.fillRect(x - barW, y + 12 + barH - barFill, barW, barFill);

        // Deploying glow
        if (car.ersDeploying) {
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00aaff';
            ctx.shadowBlur = 8;
            ctx.strokeRect(x - barW, y + 12, barW, barH);
            ctx.shadowBlur = 0;
        }

        // Percentage
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '9px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(ersRatio * 100) + '%', x - barW / 2 - 4 + barW / 2, y + 12 + barH + 4);
    }

    _drawFuelGauge(car) {
        const ctx = this.ctx;
        const x = this.width - 50;
        const y = 220;
        const barH = 80;
        const barW = 14;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(x - barW - 4, y - 4, barW + 8, barH + 30, 6);
        ctx.fill();

        // Label
        ctx.fillStyle = '#ff9900';
        ctx.font = 'bold 9px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FUEL', x - barW / 2 - 4 + barW / 2, y - 1);

        // Bar bg
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - barW, y + 12, barW, barH);

        const fuelRatio = car.fuel / CONFIG.FUEL_START;
        const barFill = barH * fuelRatio;

        // Fuel color
        const fuelColor = fuelRatio > 0.3 ? '#ff9900' : '#ff2200';
        ctx.fillStyle = fuelColor;
        ctx.fillRect(x - barW, y + 12 + barH - barFill, barW, barFill);

        // KG display
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '9px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(car.fuel) + 'kg', x - barW / 2 - 4 + barW / 2, y + 12 + barH + 4);
    }

    _drawDRSIndicator(car) {
        const ctx = this.ctx;
        const x = this.width - 90;
        const y = this.height - 85;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x, y, 80, 30, 6);
        ctx.fill();

        if (car.drsActive) {
            ctx.fillStyle = '#00ff44';
            ctx.font = 'bold 13px Formula1, monospace';
        } else if (car.drsAvailable) {
            ctx.fillStyle = '#888888';
            ctx.font = '13px Formula1, monospace';
        } else {
            ctx.fillStyle = '#333333';
            ctx.font = '13px Formula1, monospace';
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DRS', x + 40, y + 15);

        // Glow if active
        if (car.drsActive) {
            ctx.strokeStyle = '#00ff44';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#00ff44';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.roundRect(x, y, 80, 30, 6);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    _drawTimingTower(cars, playerCar) {
        const ctx = this.ctx;
        const x = this.width - 175;
        const y = 55;
        const rowH = 20;
        const panelW = 165;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.roundRect(x - 5, y, panelW, Math.min(cars.length, 10) * rowH + 25, 6);
        ctx.fill();

        // Header
        ctx.fillStyle = '#e10600';
        ctx.fillRect(x - 5, y, panelW, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('STANDINGS', x - 5 + panelW / 2, y + 13);

        // Sort cars by position
        const sorted = [...cars].sort((a, b) => a.racePosition - b.racePosition);
        const displayCount = Math.min(sorted.length, 10);

        for (let i = 0; i < displayCount; i++) {
            const car = sorted[i];
            const rowY = y + 20 + i * rowH;
            const isPlayer = car.isPlayer;

            // Highlight player row
            if (isPlayer) {
                ctx.fillStyle = 'rgba(225, 6, 0, 0.3)';
                ctx.fillRect(x - 5, rowY, panelW, rowH);
            }

            // Team color strip
            ctx.fillStyle = car.primaryColor;
            ctx.fillRect(x - 5, rowY, 4, rowH);

            // Position
            ctx.fillStyle = isPlayer ? '#ffffff' : '#aaaaaa';
            ctx.font = isPlayer ? 'bold 10px Formula1, monospace' : '10px Formula1, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`P${car.racePosition}`, x + 2, rowY + rowH * 0.7);

            // Driver name
            ctx.fillText(car.driverName.substring(0, 3).toUpperCase(), x + 22, rowY + rowH * 0.7);

            // Lap info
            ctx.fillStyle = '#888888';
            ctx.font = '9px Formula1, monospace';
            ctx.textAlign = 'right';

            if (car.finished) {
                ctx.fillStyle = '#00ff44';
                ctx.fillText('FIN', x + panelW - 5, rowY + rowH * 0.7);
            } else if (car.inPitLane) {
                ctx.fillStyle = '#ffaa00';
                ctx.fillText('PIT', x + panelW - 5, rowY + rowH * 0.7);
            } else if (i === 0) {
                // Leader shows lap time
                ctx.fillStyle = '#aaaaaa';
                if (car.lastLapTime > 0) {
                    ctx.fillText(Utils.formatTime(car.lastLapTime), x + panelW - 5, rowY + rowH * 0.7);
                }
            } else {
                // Gap to leader
                const gap = car.gapAhead;
                if (gap > 0) {
                    ctx.fillStyle = '#aaaaaa';
                    ctx.fillText(gap < 60 ? '+' + gap.toFixed(1) + 's' : '+1 LAP', x + panelW - 5, rowY + rowH * 0.7);
                }
            }

            // Tire compound dot
            const compound = CONFIG.TIRE_COMPOUNDS[car.tireCompound];
            ctx.fillStyle = compound.color;
            ctx.beginPath();
            ctx.arc(x + 75, rowY + rowH * 0.5, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawMiniMap(track, cars, playerCar) {
        const ctx = this.ctx;
        const mapX = 10;
        const mapY = this.height - 150;
        const mapW = 150;
        const mapH = 130;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(mapX, mapY, mapW, mapH, 8);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(mapX + 2, mapY + 2, mapW - 4, mapH - 4, 6);
        ctx.clip();

        // Calculate track bounds for scaling
        const bounds = track.bounds;
        const trackW = bounds.maxX - bounds.minX;
        const trackH = bounds.maxY - bounds.minY;
        const scale = Math.min((mapW - 10) / trackW, (mapH - 10) / trackH) * 0.9;
        const offsetX = mapX + mapW / 2 - (bounds.minX + trackW / 2) * scale;
        const offsetY = mapY + mapH / 2 - (bounds.minY + trackH / 2) * scale;

        const toMap = (x, y) => ({
            x: x * scale + offsetX,
            y: y * scale + offsetY
        });

        // Draw track outline
        const points = track.pathPoints;
        const n = points.length;

        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const p = toMap(points[i].x, points[i].y);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw track surface
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 5;
        ctx.stroke();

        // Draw all cars
        for (const car of cars) {
            const cp = toMap(car.x, car.y);
            const isPlayer = car.isPlayer;

            ctx.fillStyle = isPlayer ? '#ffffff' : car.primaryColor;
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, isPlayer ? 3.5 : 2.5, 0, Math.PI * 2);
            ctx.fill();

            if (isPlayer) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        // Track name
        ctx.fillStyle = '#666666';
        ctx.font = '8px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(track.shortName, mapX + mapW / 2, mapY + mapH - 4);

        ctx.restore();
    }

    _drawWeatherIndicator(weather) {
        const ctx = this.ctx;
        const x = 10;
        const y = 56;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(x, y, 110, 22, 4);
        ctx.fill();

        const weatherName = weather.getWeatherName ? weather.getWeatherName() : 'Dry';
        const rainIntensity = weather.rainIntensity || 0;

        ctx.fillStyle = rainIntensity > 0.5 ? '#4488ff' : rainIntensity > 0 ? '#88bbff' : '#ffffff';
        ctx.font = '10px Formula1, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(weatherName.toUpperCase(), x + 22, y + 11);

        // Weather icon
        if (rainIntensity > 0) {
            ctx.fillStyle = '#4488ff';
            // Rain drops
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(x + 8 + i * 3, y + 11, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Sun
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.arc(x + 11, y + 11, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawPitLaneMessage(car) {
        const ctx = this.ctx;
        const x = this.width / 2;
        const y = this.height - 120;

        ctx.save();
        if (car.pitStopActive) {
            // Pit stop in progress
            const progress = car.pitStopTimer / car.pitStopDuration;
            const alpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;

            ctx.fillStyle = `rgba(255, 150, 0, ${alpha})`;
            ctx.font = 'bold 24px Formula1, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PIT STOP - ' + car.pitStopTimer.toFixed(1) + 's', x, y);

            // Progress bar
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(x - 100, y + 20, 200, 10);
            ctx.fillStyle = '#ff9900';
            ctx.fillRect(x - 100, y + 20, 200 * progress, 10);
        } else {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.font = 'bold 18px Formula1, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PIT LANE - SPEED LIMIT', x, y);
        }
        ctx.restore();
    }

    _drawMessages() {
        const ctx = this.ctx;
        this.messages = this.messages.filter(m => m.life > 0);
        const x = this.width / 2;

        for (let i = 0; i < this.messages.length; i++) {
            const msg = this.messages[i];
            msg.life -= 0.016;

            const alpha = Math.min(1, msg.life * 2);
            const yPos = this.height / 2 - 60 - i * 30;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.beginPath();
            ctx.roundRect(x - 150, yPos - 14, 300, 28, 6);
            ctx.fill();

            ctx.fillStyle = msg.color || '#ffffff';
            ctx.font = 'bold 14px Formula1, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(msg.text, x, yPos);
            ctx.restore();
        }
    }

    _drawSectorFlash() {
        if (!this.sectorFlash) return;
        this.sectorFlashTimer -= 0.016;
        if (this.sectorFlashTimer <= 0) {
            this.sectorFlash = null;
            return;
        }

        const ctx = this.ctx;
        const alpha = Math.min(1, this.sectorFlashTimer);
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.width / 2 - 80, this.height / 2, 160, 40);
        ctx.fillStyle = this.sectorFlash.color;
        ctx.font = 'bold 18px Formula1, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.sectorFlash.text, this.width / 2, this.height / 2 + 20);
        ctx.restore();
    }

    _drawPlayer2Speed(car) {
        const ctx = this.ctx;
        const x = 10;
        const y = this.height - 75;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(x, y, 90, 30, 6);
        ctx.fill();

        ctx.fillStyle = '#3399ff';
        ctx.font = 'bold 10px Formula1, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('P2 ' + Math.round(car.speedKmh) + ' km/h', x + 5, y + 18);
    }

    addMessage(text, color, duration) {
        this.messages.unshift({
            text,
            color: color || '#ffffff',
            life: duration || 3
        });
        if (this.messages.length > 5) this.messages.pop();
    }

    showSectorTime(sectorNum, time, color) {
        this.sectorFlash = {
            text: `S${sectorNum}: ${Utils.formatTime(time)}`,
            color: color || '#ffffff'
        };
        this.sectorFlashTimer = 3.0;
    }
}
