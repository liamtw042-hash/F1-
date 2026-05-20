// Car class - full state management for F1 cars

class Car {
    constructor(options = {}) {
        // Identity
        this.id = options.id || 0;
        this.driverName = options.driverName || 'Driver';
        this.driverNumber = options.driverNumber || 0;
        this.team = options.team || CONFIG.TEAMS[0];
        this.isPlayer = options.isPlayer || false;
        this.playerIndex = options.playerIndex || 0;
        this.isAI = !this.isPlayer;

        // Position and orientation
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.angle = options.angle || 0;

        // Velocity
        this.vx = 0;
        this.vy = 0;
        this.speed = 0;
        this.speedKmh = 0;

        // Angular
        this.angularVelocity = 0;

        // Engine
        this.rpm = CONFIG.MIN_RPM;
        this.gear = 1;
        this.wheelSpeed = 0;
        this.gearShiftTimer = 0;
        this.throttle = 0;
        this.brakeInput = 0;

        // ERS
        this.ersEnergy = CONFIG.ERS_MAX_ENERGY * 0.5;
        this.ersDeploying = false;

        // DRS
        this.drsActive = false;
        this.drsAvailable = false;
        this.drsZoneProgress = 0;

        // Fuel
        this.fuel = CONFIG.FUEL_START;
        this.fuelLapStart = CONFIG.FUEL_START;

        // Tires
        this.tireCompound = options.tireCompound || 'MEDIUM';
        this.tireWear = [0, 0, 0, 0]; // FL, FR, RL, RR
        this.tireTemp = [60, 60, 60, 60]; // Celsius

        // Race state
        this.currentLap = 1;
        this.totalLaps = options.totalLaps || 5;
        this.racePosition = options.racePosition || 1;
        this.lapProgress = 0; // 0-1 fraction of lap completed
        this.trackProgress = 0; // distance along track path index
        this.distanceRaced = 0;
        this.lapDistance = 0;

        // Lap timing
        this.lapTime = 0;
        this.lastLapTime = 0;
        this.bestLapTime = Infinity;
        this.totalRaceTime = 0;
        this.sectorTimes = [0, 0, 0];
        this.currentSector = 1;
        this.sectorStart = 0;
        this.bestSectorTimes = [Infinity, Infinity, Infinity];

        // Gap to ahead/behind
        this.gapAhead = 0;
        this.gapBehind = 0;

        // Pit stop state
        this.inPitLane = false;
        this.pitStopActive = false;
        this.pitStopTimer = 0;
        this.pitStopDuration = 2.5; // seconds
        this.pitStops = 0;
        this.pitRequested = false;

        // Visual effects
        this.wheelSpin = false;
        this.lockup = false;
        this.lateralG = 0;
        this.sparkTimer = 0;

        // Driver skill (for AI)
        this.skill = options.skill || 0.85;
        this.aggression = options.aggression || 0.7;
        this.consistency = options.consistency || 0.85;

        // Weather
        this.weather = 'DRY';

        // Status
        this.finished = false;
        this.retired = false;
        this.dnf = false;

        // Championship
        this.championshipPoints = 0;

        // Track waypoint tracking for AI and lap counting
        this.currentWaypoint = 0;
        this.waypointsPassed = new Set();
        this.lapStartTime = 0;
        this.crossedFinishLine = false;
        this.hasStarted = false;

        // Color
        this.primaryColor = this.team.primaryColor || '#ff0000';
        this.secondaryColor = this.team.secondaryColor || '#ffffff';

        // Collision
        this.width = 1.8;  // meters
        this.length = 5.0; // meters
        this.collisionTimer = 0;
    }

    reset(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.vx = 0;
        this.vy = 0;
        this.speed = 0;
        this.speedKmh = 0;
        this.angularVelocity = 0;
        this.rpm = CONFIG.MIN_RPM;
        this.gear = 1;
        this.wheelSpin = false;
        this.lockup = false;
        this.drsActive = false;
        this.drsAvailable = false;
    }

    startRace(x, y, angle, totalLaps, tireCompound) {
        this.reset(x, y, angle);
        this.totalLaps = totalLaps;
        this.tireCompound = tireCompound || 'MEDIUM';
        this.tireWear = [0, 0, 0, 0];
        this.tireTemp = [50, 50, 50, 50];
        this.fuel = CONFIG.FUEL_START;
        this.fuelLapStart = CONFIG.FUEL_START;
        this.currentLap = 1;
        this.lapProgress = 0;
        this.trackProgress = 0;
        this.distanceRaced = 0;
        this.lapTime = 0;
        this.lastLapTime = 0;
        this.bestLapTime = Infinity;
        this.totalRaceTime = 0;
        this.sectorTimes = [0, 0, 0];
        this.currentSector = 1;
        this.sectorStart = 0;
        this.bestSectorTimes = [Infinity, Infinity, Infinity];
        this.pitStops = 0;
        this.pitRequested = false;
        this.pitStopActive = false;
        this.pitStopTimer = 0;
        this.inPitLane = false;
        this.finished = false;
        this.retired = false;
        this.ersEnergy = CONFIG.ERS_MAX_ENERGY * 0.5;
        this.lapStartTime = 0;
        this.hasStarted = false;
        this.currentWaypoint = 0;
        this.lapProgress = 0;
        this.trackProgress = 0;
        this._aiInputs = null;
    }

    completeLap(raceTime) {
        const lapTime = raceTime - this.lapStartTime;
        this.lastLapTime = lapTime;
        if (lapTime < this.bestLapTime) {
            this.bestLapTime = lapTime;
        }
        this.lapStartTime = raceTime;
        this.fuelLapStart = this.fuel;

        // Check if race finished
        if (this.currentLap >= this.totalLaps) {
            this.finished = true;
            this.totalRaceTime = raceTime;
        } else {
            this.currentLap++;
            this.lapTime = 0;
        }
    }

    requestPitStop() {
        if (!this.inPitLane && !this.pitStopActive) {
            this.pitRequested = true;
        }
    }

    startPitStop(newCompound) {
        this.pitStopActive = true;
        this.pitStopTimer = 0;
        this.pitStops++;
        this.pendingCompound = newCompound || this.tireCompound;
        this.vx = 0;
        this.vy = 0;
    }

    updatePitStop(dt) {
        if (!this.pitStopActive) return false;

        this.pitStopTimer += dt;
        if (this.pitStopTimer >= this.pitStopDuration) {
            // Pit stop complete
            this.tireCompound = this.pendingCompound || this.tireCompound;
            this.tireWear = [0, 0, 0, 0];
            this.tireTemp = [50, 50, 50, 50];
            this.pitStopActive = false;
            this.pitRequested = false;
            return true;
        }
        return false;
    }

    getAverageTireWear() {
        return (this.tireWear[0] + this.tireWear[1] + this.tireWear[2] + this.tireWear[3]) / 4;
    }

    getAverageTireTemp() {
        return (this.tireTemp[0] + this.tireTemp[1] + this.tireTemp[2] + this.tireTemp[3]) / 4;
    }

    getTireStatus() {
        const compound = CONFIG.TIRE_COMPOUNDS[this.tireCompound];
        const avgWear = this.getAverageTireWear();
        const avgTemp = this.getAverageTireTemp();
        return {
            compound: this.tireCompound,
            compoundName: compound.name,
            color: compound.color,
            wear: avgWear,
            temp: avgTemp,
            isOptimalTemp: Math.abs(avgTemp - compound.optimalTemp) < compound.tempRange
        };
    }

    getFuelStatus() {
        return {
            kg: this.fuel,
            percentage: this.fuel / CONFIG.FUEL_START,
            lapsRemaining: this.fuel / CONFIG.FUEL_PER_LAP
        };
    }

    getERSStatus() {
        return {
            energy: this.ersEnergy,
            percentage: this.ersEnergy / CONFIG.ERS_MAX_ENERGY,
            deploying: this.ersDeploying
        };
    }

    // Serialize for multiplayer sync
    serialize() {
        return {
            id: this.id,
            x: Math.round(this.x * 100) / 100,
            y: Math.round(this.y * 100) / 100,
            angle: Math.round(this.angle * 1000) / 1000,
            speed: Math.round(this.speed * 10) / 10,
            vx: Math.round(this.vx * 100) / 100,
            vy: Math.round(this.vy * 100) / 100,
            gear: this.gear,
            rpm: Math.round(this.rpm),
            currentLap: this.currentLap,
            lapProgress: Math.round(this.lapProgress * 10000) / 10000,
            racePosition: this.racePosition,
            drsActive: this.drsActive,
            ersDeploying: this.ersDeploying,
            tireCompound: this.tireCompound,
            tireWear: this.tireWear.map(w => Math.round(w * 1000) / 1000),
            finished: this.finished
        };
    }

    // Deserialize multiplayer update
    applyUpdate(data) {
        this.x = data.x;
        this.y = data.y;
        this.angle = data.angle;
        this.speed = data.speed;
        this.vx = data.vx;
        this.vy = data.vy;
        this.gear = data.gear;
        this.rpm = data.rpm;
        this.currentLap = data.currentLap;
        this.lapProgress = data.lapProgress;
        this.racePosition = data.racePosition;
        this.drsActive = data.drsActive;
        this.ersDeploying = data.ersDeploying;
        this.tireCompound = data.tireCompound;
        this.tireWear = data.tireWear;
        this.finished = data.finished;
    }
}
