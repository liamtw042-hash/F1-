// Main Game Loop and State Machine
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;

        this.renderer = new Renderer(this.canvas);
        this.hud = new HUD(this.canvas);
        this.physics = new Physics();
        this.particles = new ParticleSystem();
        this.weather = new WeatherSystem();
        this.audio = new AudioSystem();
        this.multiplayer = new MultiplayerClient();

        this.state = 'MENU'; // MENU | COUNTDOWN | RACING | PAUSED | RACE_OVER
        this.cars = [];
        this.playerCars = [];
        this.aiManager = null;
        this.track = null;

        this.raceTime = 0;
        this.countdownTime = 4;
        this.countdownTimer = 0;
        this.totalLaps = 5;
        this.numAI = 19;

        this.keys = {};
        this.prevKeys = {};

        this.lastFrameTime = 0;
        this.accumulator = 0;
        this.fixedDt = CONFIG.PHYSICS_TIMESTEP;

        this.raceFinishedTimer = 0;
        this.raceResults = [];

        this.championship = {
            active: false,
            round: 0,
            standings: []
        };

        // Track registry — const declarations are NOT window properties, so use explicit map
        this.tracks = {
            monaco:      MonacoTrack,
            spa:         SpaTrack,
            silverstone: SilverstoneTrack,
            monza:       MonzaTrack,
            suzuka:      SuzukaTrack
        };

        this._setupInput();
        this._setupMultiplayer();
        requestAnimationFrame((t) => this._loop(t));
    }

    _setupInput() {
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.code]) this.prevKeys[e.code] = false;
            this.keys[e.code] = true;
            e.preventDefault();
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    _setupMultiplayer() {
        this.multiplayer.onMessage = (text, type) => {
            if (this.hud) this.hud.addMessage(text, type === 'error' ? '#ff4444' : '#00aaff');
        };
        this.multiplayer.onStateUpdate = (playerId, state) => {
            const car = this.cars.find(c => c.multiplayerId === playerId);
            if (car) car.applyUpdate(state);
        };
        this.multiplayer.onRaceStart = (msg) => {
            this.startRace(msg.trackKey, msg.totalLaps, msg.weather, msg.playerIndex);
        };
    }

    startRace(trackKey, totalLaps, weatherType, playerCount) {
        weatherType = weatherType || 'DRY';
        totalLaps = totalLaps || 5;
        playerCount = playerCount || 1;

        // Load track
        const trackData = this.tracks[trackKey];
        if (!trackData) { console.error('Track not found:', trackKey); return; }
        this.track = new Track(trackData);
        this.totalLaps = totalLaps;

        // Setup weather
        this.weather.setWeather(weatherType);

        // Clear cars
        this.cars = [];
        this.playerCars = [];

        // Create player car(s)
        for (let p = 0; p < playerCount; p++) {
            const driverData = CONFIG.DRIVERS[p];
            const teamData = CONFIG.TEAMS[driverData.team];
            const car = new Car({
                id: p,
                driverName: driverData.name,
                driverNumber: driverData.number,
                team: teamData,
                isPlayer: true,
                playerIndex: p,
                totalLaps,
                skill: driverData.skill,
                tireCompound: weatherType === 'HEAVY_RAIN' ? 'WET' : weatherType === 'LIGHT_RAIN' ? 'INTERMEDIATE' : 'MEDIUM'
            });
            const startPos = this._getGridPosition(p);
            car.startRace(startPos.x, startPos.y, this.track.data.startAngle || 0, totalLaps, car.tireCompound);
            car.racePosition = p + 1;
            this.cars.push(car);
            this.playerCars.push(car);
        }

        // Create AI cars
        this.aiManager = new AIManager(this.track);
        const aiCount = Math.min(this.numAI, 20 - playerCount);
        for (let i = 0; i < aiCount; i++) {
            const driverIdx = playerCount + i;
            const driverData = CONFIG.DRIVERS[driverIdx % CONFIG.DRIVERS.length];
            const teamData = CONFIG.TEAMS[driverData.team];
            const car = new Car({
                id: playerCount + i,
                driverName: driverData.name,
                driverNumber: driverData.number,
                team: teamData,
                isAI: true,
                totalLaps,
                skill: driverData.skill,
                aggression: driverData.aggression,
                consistency: driverData.consistency,
                tireCompound: weatherType === 'HEAVY_RAIN' ? 'WET' : weatherType === 'LIGHT_RAIN' ? 'INTERMEDIATE' :
                    (Math.random() > 0.5 ? 'MEDIUM' : 'SOFT')
            });
            const startPos = this._getGridPosition(playerCount + i);
            car.startRace(startPos.x, startPos.y, this.track.data.startAngle || 0, totalLaps, car.tireCompound);
            car.racePosition = playerCount + i + 1;
            this.cars.push(car);
            this.aiManager.addDriver(car);
        }

        // Init audio
        this.audio.init();

        // State
        this.raceTime = 0;
        this.countdownTimer = this.countdownTime;
        this.raceFinishedTimer = 0;
        this.raceResults = [];
        this.state = 'COUNTDOWN';

        // Set initial camera
        const pc = this.playerCars[0];
        this.renderer.cameraX = pc.x;
        this.renderer.cameraY = pc.y;

        document.getElementById('menu').style.display = 'none';
        document.getElementById('gameCanvas').style.display = 'block';
        document.getElementById('hud').style.display = 'block';
    }

    _getGridPosition(index) {
        const sp = this.track.data.startPosition;
        const angle = this.track.data.startAngle || 0;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const nx = -sinA;
        const ny = cosA;

        const row = Math.floor(index / 2);
        const col = index % 2;
        const rowSpacing = 12;
        const colOffset = (col === 0 ? -4 : 4);

        return {
            x: sp.x - cosA * row * rowSpacing + nx * colOffset,
            y: sp.y - sinA * row * rowSpacing + ny * colOffset
        };
    }

    _loop(timestamp) {
        const dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
        this.lastFrameTime = timestamp;

        this.prevKeys = { ...this.keys };

        switch (this.state) {
            case 'COUNTDOWN': this._updateCountdown(dt); break;
            case 'RACING':    this._updateRacing(dt);    break;
            case 'PAUSED':    this._updatePaused();       break;
            case 'RACE_OVER': this._updateRaceOver(dt);  break;
        }

        if (this.state !== 'MENU') this._render(dt);

        requestAnimationFrame((t) => this._loop(t));
    }

    _updateCountdown(dt) {
        this.countdownTimer -= dt;
        if (this.countdownTimer <= 0) {
            this.state = 'RACING';
            this.raceTime = 0;
            for (const car of this.cars) car.lapStartTime = 0;
            this.hud.addMessage('GO!', '#00ff44', 2);
        }
        this.weather.update(dt);
    }

    _updateRacing(dt) {
        if (this._keyJustPressed('Escape')) {
            this.state = 'PAUSED';
            return;
        }

        this.raceTime += dt;
        this.weather.update(dt);
        this.particles.update(dt);

        // Fixed-step physics accumulator
        this.accumulator += dt;
        while (this.accumulator >= this.fixedDt) {
            this._physicsStep(this.fixedDt);
            this.accumulator -= this.fixedDt;
        }

        // AI update
        if (this.aiManager) {
            this.aiManager.update(this.cars, dt, this.raceTime);
        }

        // Apply AI inputs
        for (const car of this.cars) {
            if (car.isAI && car._aiInputs) {
                this.physics.update(car, car._aiInputs, this.track, dt);
            }
        }

        // Update race logic
        this._updateRaceLogic(dt);

        // Update positions
        this._updateRacePositions();

        // Audio for player car
        if (this.playerCars[0]) {
            this.audio.update(this.playerCars[0], dt);
        }

        // Send multiplayer state
        if (this.multiplayer.isConnected() && this.playerCars[0]) {
            this.multiplayer.sendCarState(this.playerCars[0]);
        }

        // Check if race is over
        const allPlayersDone = this.playerCars.every(c => c.finished || c.retired);
        if (allPlayersDone) {
            this.state = 'RACE_OVER';
            this.raceFinishedTimer = 5;
            this._finalizeResults();
        }
    }

    _physicsStep(dt) {
        for (const car of this.cars) {
            if (car.isPlayer && !car.pitStopActive) {
                const inputs = this._getPlayerInputs(car.playerIndex);
                car.throttle = inputs.accelerate;
                car.brakeInput = inputs.brake;
                car._aiInputs = inputs; // Store for rendering (steer angle)
                this.physics.update(car, inputs, this.track, dt);
            }
        }
    }

    _getPlayerInputs(playerIndex) {
        const ctrl = playerIndex === 0 ? CONTROLS.P1 : CONTROLS.P2;
        return {
            accelerate: this.keys[ctrl.accelerate] ? 1 : 0,
            brake: this.keys[ctrl.brake] ? 1 : 0,
            steer: (this.keys[ctrl.steerRight] ? 1 : 0) - (this.keys[ctrl.steerLeft] ? 1 : 0),
            drs: !!this.keys[ctrl.drs],
            ers: !!this.keys[ctrl.ers],
            pit: this._keyJustPressed(ctrl.pit)
        };
    }

    _updateRaceLogic(dt) {
        for (const car of this.cars) {
            if (car.finished || car.retired) continue;

            // Lap time is computed from raceTime - lapStartTime in car
            if (car.hasStarted) {
                car.lapTime = this.raceTime - car.lapStartTime;
            }
            car.totalRaceTime = this.raceTime;

            // Update weather on car
            car.weather = this.weather.currentWeather;

            // Lap counting via waypoints
            this._updateLapProgress(car);

            // Pit stop trigger
            if (car.isPlayer) {
                const ctrl = car.playerIndex === 0 ? CONTROLS.P1 : CONTROLS.P2;
                if (this._keyJustPressed(ctrl.pit)) car.requestPitStop();
            }
            if (car.pitRequested && car.inPitLane && !car.pitStopActive) {
                car.startPitStop(car.pendingCompound || car.tireCompound);
                if (car.isPlayer) {
                    this.hud.addMessage('PIT STOP - Changing tires...', '#ffaa00', 3);
                }
            }
            if (car.pitStopActive) {
                const done = car.updatePitStop(dt);
                if (done && car.isPlayer) {
                    this.hud.addMessage(`Tires changed: ${CONFIG.TIRE_COMPOUNDS[car.tireCompound].name}`, '#00ff88', 3);
                }
            }

            // Particle effects
            this.particles.emitTireSmoke(car);
            this.particles.emitBrakeSmoke(car);
            this.particles.emitKerbSparks(car);
            if (this.weather.rainIntensity > 0.1) {
                this.particles.emitWaterSpray(car, this.weather.rainIntensity);
            }
        }
    }

    _updateLapProgress(car) {
        const n = this.track.totalPoints;
        const nearest = this.track.findNearestWaypoint(car.x, car.y, car.currentWaypoint, 80);
        const newWP = nearest.index;

        // Check if we've crossed the finish line (waypoint 0)
        const prevWP = car.currentWaypoint;
        car.currentWaypoint = newWP;
        car.lapProgress = newWP / n;

        // Detect pit lane
        if (car.pitRequested && nearest.dist < 30) {
            car.inPitLane = true;
        }
        if (car.inPitLane && !car.pitRequested && !car.pitStopActive) {
            car.inPitLane = false;
        }

        // DRS zone check
        const inDRS = this.track.isInDRSZone(car.lapProgress);
        car.drsAvailable = inDRS && (car.racePosition > 1 || true); // simplification

        // Sector tracking
        const sector = this.track.getSectorAt(car.lapProgress);
        if (sector !== car.currentSector) {
            const sectorIdx = car.currentSector - 1;
            car.sectorTimes[sectorIdx] = car.lapTime - car.sectorStart;
            if (car.sectorTimes[sectorIdx] < car.bestSectorTimes[sectorIdx]) {
                car.bestSectorTimes[sectorIdx] = car.sectorTimes[sectorIdx];
            }
            if (car.isPlayer) {
                const color = car.sectorTimes[sectorIdx] <= car.bestSectorTimes[sectorIdx] ? '#cc44ff' : '#ffff00';
                this.hud.showSectorTime(car.currentSector, car.sectorTimes[sectorIdx], color);
            }
            car.sectorStart = car.lapTime;
            car.currentSector = sector;
        }

        // Lap crossing: detect wrap-around from near-end to near-start
        const crossedLine = prevWP > n * 0.85 && newWP < n * 0.15;
        if (crossedLine && car.hasStarted) {
            car.completeLap(this.raceTime);
            if (car.isPlayer) {
                const color = car.lastLapTime < car.bestLapTime * 1.001 ? '#cc44ff' : '#ffffff';
                this.hud.addMessage(`LAP ${car.currentLap - 1}: ${Utils.formatTime(car.lastLapTime)}`, color, 4);
                if (car.finished) {
                    this.hud.addMessage('RACE FINISHED! P' + car.racePosition, '#00ff44', 8);
                }
            }
        }
        if (newWP > 5 && !car.hasStarted) car.hasStarted = true;
    }

    _updateRacePositions() {
        // Sort by laps completed then track progress
        const sorted = [...this.cars].sort((a, b) => {
            if (a.finished && !b.finished) return -1;
            if (!a.finished && b.finished) return 1;
            const lapDiff = b.currentLap - a.currentLap;
            if (lapDiff !== 0) return lapDiff;
            return b.lapProgress - a.lapProgress;
        });

        let pos = 1;
        for (const car of sorted) {
            car.racePosition = pos++;
        }

        // Calculate gaps
        const leader = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            const car = sorted[i];
            const lapDiff = leader.currentLap - car.currentLap;
            const progressDiff = (leader.lapProgress + leader.currentLap) - (car.lapProgress + car.currentLap);
            car.gapAhead = Math.max(0, progressDiff * (this.track.data.lapLength / CONFIG.MAX_SPEED));
        }
        if (sorted[0]) sorted[0].gapAhead = 0;
    }

    _updatePaused() {
        if (this._keyJustPressed('Escape')) {
            this.state = 'RACING';
        }
        // Rendering is handled by _render, which checks state === 'PAUSED'
    }

    _updateRaceOver(dt) {
        this.raceFinishedTimer -= dt;
        this.weather.update(dt);
        this.particles.update(dt);
        if (this.raceFinishedTimer <= 0) {
            this._showResults();
        }
    }

    _finalizeResults() {
        const sorted = [...this.cars].sort((a, b) => a.racePosition - b.racePosition);
        this.raceResults = sorted.map((car, i) => ({
            position: i + 1,
            driverName: car.driverName,
            team: car.team.shortName,
            totalTime: car.totalRaceTime,
            bestLap: car.bestLapTime,
            pitStops: car.pitStops,
            points: CONFIG.POINTS[i] || 0,
            isPlayer: car.isPlayer
        }));

        // Add to championship
        if (this.championship.active) {
            for (const result of this.raceResults) {
                const existing = this.championship.standings.find(s => s.name === result.driverName);
                if (existing) existing.points += result.points;
                else this.championship.standings.push({ name: result.driverName, team: result.team, points: result.points });
            }
            this.championship.standings.sort((a, b) => b.points - a.points);
            this.championship.round++;
        }
    }

    _showResults() {
        this.state = 'MENU';
        document.getElementById('gameCanvas').style.display = 'none';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('menu').style.display = 'flex';

        if (window.gameMenu) {
            gameMenu.showResults(this.raceResults);
        }
    }

    _render(dt) {
        const playerCar = this.playerCars[0];
        if (!playerCar || !this.track) return;

        // Follow player
        this.renderer.followCar(playerCar, dt);

        // Draw background
        this.renderer.drawBackground(this.track);

        // Draw track
        this.renderer.drawTrack(this.track, this.weather);

        // Draw particles behind cars
        this.particles.draw(this.renderer.ctx, this.renderer.cameraX, this.renderer.cameraY, this.renderer.cameraScale);

        // Motion blur
        for (const car of this.cars) this.renderer.drawMotionBlur(car);

        // Draw all cars
        const sortedByDist = [...this.cars].sort((a, b) => {
            const da = Utils.dist(a.x, a.y, playerCar.x, playerCar.y);
            const db = Utils.dist(b.x, b.y, playerCar.x, playerCar.y);
            return db - da;
        });
        for (const car of sortedByDist) this.renderer.drawCar(car);

        // Speed vignette
        this.renderer.drawSpeedEffect(playerCar);

        // Rain overlay
        if (this.weather.rainIntensity > 0) {
            this.particles.drawRain(this.renderer.ctx, this.weather.rainDrops, this.weather.rainIntensity);
        }

        // Countdown overlay
        if (this.state === 'COUNTDOWN') {
            this._renderCountdown();
        }

        // HUD
        this.hud.draw({
            cars: this.cars,
            playerCar,
            track: this.track,
            weather: this.weather,
            raceTime: this.raceTime,
            totalLaps: this.totalLaps
        });

        // Pause overlay (drawn last so it sits on top of everything)
        if (this.state === 'PAUSED') {
            const ctx = this.renderer.ctx;
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 52px Arial Black, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('PAUSED', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 24);
            ctx.font = '22px Arial, monospace';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText('Press ESC to resume', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 30);
        }

        // Multiplayer latency
        if (this.multiplayer.isConnected()) {
            const ctx = this.renderer.ctx;
            ctx.fillStyle = '#00ff44';
            ctx.font = '10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`${this.multiplayer.getLatency()}ms`, CONFIG.CANVAS_WIDTH - 5, CONFIG.CANVAS_HEIGHT - 5);
        }
    }

    _renderCountdown() {
        const ctx = this.renderer.ctx;
        const num = Math.ceil(this.countdownTimer);
        const t = 1 - (this.countdownTimer % 1);

        ctx.save();
        ctx.globalAlpha = 1 - t * 0.8;
        ctx.fillStyle = num <= 0 ? '#00ff44' : '#ffffff';
        ctx.font = `bold ${120 + t * 40}px Formula1, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = num <= 0 ? 'GO!' : num === 4 ? 'READY' : String(num - 1);
        ctx.fillText(text, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);

        // F1 lights
        const lights = num <= 3 ? (4 - num) : 0;
        for (let i = 0; i < 5; i++) {
            const lx = CONFIG.CANVAS_WIDTH / 2 - 100 + i * 50;
            const ly = 120;
            ctx.globalAlpha = 1;
            ctx.fillStyle = i < lights ? '#ff0000' : '#330000';
            ctx.shadowColor = i < lights ? '#ff0000' : 'transparent';
            ctx.shadowBlur = i < lights ? 20 : 0;
            ctx.beginPath();
            ctx.arc(lx, ly, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }

    _keyJustPressed(code) {
        return this.keys[code] && !this.prevKeys[code];
    }
}
