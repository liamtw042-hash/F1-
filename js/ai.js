// AI Driver Logic
// Implements racing line following, braking, overtaking, and pit stop strategy

class AIDriver {
    constructor(car, track) {
        this.car = car;
        this.track = track;

        // AI state
        this.targetWaypoint = 0;
        this.lookAheadDistance = 80; // pixels
        this.brakeDistance = 60;

        // Overtaking state
        this.overtakingTarget = null;
        this.overtakeTimer = 0;
        this.defendingTimer = 0;
        this.overtakeSide = 0; // -1 left, 1 right

        // Pit strategy
        this.plannedPitLap = this._planPitStop();
        this.hasCompletedPit = false;

        // Path offset for racing variation
        this.pathOffset = Utils.random(-0.3, 0.3);
        this.targetPathOffset = this.pathOffset;

        // Randomize slightly for realistic variation
        this.reactionDelay = Utils.random(0.05, 0.15);
        this.throttleSmooth = 0;
        this.steerSmooth = 0;

        // Difficulty-based performance modifier
        this.perfModifier = 0.85 + car.skill * 0.15;
    }

    _planPitStop() {
        // Random pit lap based on compound and race length
        const baseLap = Math.ceil(this.car.totalLaps * 0.45);
        const variance = Math.floor(Utils.random(-2, 3));
        return Math.max(2, baseLap + variance);
    }

    update(allCars, dt, raceTime) {
        if (this.car.finished || this.car.retired || this.car.pitStopActive) {
            return;
        }

        // Find current position on track
        const nearestResult = this.track.findNearestWaypoint(
            this.car.x, this.car.y,
            this.car.currentWaypoint, 60
        );
        this.car.currentWaypoint = nearestResult.index;

        // Get look-ahead target
        const lookAhead = this.track.getLookAheadPoint(
            this.car.currentWaypoint,
            this.lookAheadDistance + this.car.speed * 1.5
        );

        // Get racing line target (with overtake offset)
        const racingTarget = this._getRacingTarget(lookAhead, allCars);

        // Calculate steering
        const steer = this._calculateSteering(racingTarget);

        // Calculate speed target at look-ahead
        const brakeTarget = this.track.getLookAheadPoint(
            this.car.currentWaypoint,
            this.brakeDistance + this.car.speed * 2.5
        );
        const curvature = this.track.getCurvatureAt(brakeTarget.index || this.car.currentWaypoint);
        const targetSpeed = this._getTargetSpeed(curvature, allCars);

        // Calculate throttle/brake
        const { throttle, brake } = this._calculateThrottleBrake(targetSpeed);

        // DRS logic
        const drs = this._shouldUseDRS();

        // ERS logic
        const ers = this._shouldUseERS(throttle);

        // Pit stop decision
        this._checkPitStop(raceTime);

        // Apply inputs
        const inputs = {
            accelerate: throttle * this.perfModifier,
            brake: brake,
            steer: steer,
            drs: drs,
            ers: ers
        };

        // Smooth inputs
        this.throttleSmooth = Utils.lerp(this.throttleSmooth, inputs.accelerate, 0.3);
        this.steerSmooth = Utils.lerp(this.steerSmooth, inputs.steer, 0.25);

        inputs.accelerate = this.throttleSmooth;
        inputs.steer = this.steerSmooth;

        this.car._aiInputs = inputs;
    }

    _getRacingTarget(lookAhead, allCars) {
        // Check for cars ahead to overtake
        const carAhead = this._findCarAhead(allCars, 30);

        let offsetTarget = lookAhead;
        if (carAhead && this.car.speed > carAhead.speed - 2) {
            // Attempt overtake
            this.overtakeTimer += 0.016;
            if (this.overtakeTimer > 1.0) {
                this.overtakeSide = this.overtakeSide || (Math.random() > 0.5 ? 1 : -1);
            }

            const normal = this.track.normals[lookAhead.index || this.car.currentWaypoint];
            if (normal) {
                const offsetDist = this.track.getWidthAt(this.car.currentWaypoint) * 0.3 * this.overtakeSide;
                offsetTarget = {
                    x: lookAhead.x + normal.nx * offsetDist,
                    y: lookAhead.y + normal.ny * offsetDist,
                    index: lookAhead.index
                };
            }
        } else {
            this.overtakeTimer = 0;
            this.overtakeSide = 0;
        }

        // Add path offset variation
        const normal = this.track.normals[this.car.currentWaypoint];
        if (normal) {
            const trackWidth = this.track.getWidthAt(this.car.currentWaypoint);
            const offset = this.pathOffset * trackWidth * 0.15;
            offsetTarget = {
                x: offsetTarget.x + normal.nx * offset,
                y: offsetTarget.y + normal.ny * offset,
                index: offsetTarget.index
            };
        }

        return offsetTarget;
    }

    _findCarAhead(allCars, maxDistance) {
        let closest = null;
        let closestDist = Infinity;

        for (const other of allCars) {
            if (other.id === this.car.id) continue;
            if (other.finished || other.retired) continue;

            const dist = Utils.dist(this.car.x, this.car.y, other.x, other.y);
            if (dist < maxDistance && dist < closestDist) {
                // Check if actually ahead
                const cosA = Math.cos(this.car.angle);
                const sinA = Math.sin(this.car.angle);
                const dx = other.x - this.car.x;
                const dy = other.y - this.car.y;
                const dotForward = dx * cosA + dy * sinA;
                if (dotForward > 0) {
                    closest = other;
                    closestDist = dist;
                }
            }
        }
        return closest;
    }

    _calculateSteering(target) {
        const dx = target.x - this.car.x;
        const dy = target.y - this.car.y;
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = Utils.normalizeAngle(targetAngle - this.car.angle);

        // Proportional steering
        let steer = angleDiff * 2.5;

        // Reduce steering at high speed
        const speedFactor = Utils.clamp(1.0 - this.car.speed / 120, 0.2, 1.0);
        steer *= speedFactor;

        // Add some wobble for realism
        steer += (Math.random() - 0.5) * 0.02 * (1 - this.car.skill);

        return Utils.clamp(steer, -1, 1);
    }

    _getTargetSpeed(curvature, allCars) {
        let targetSpeed = this.track._cornerSpeed ? this.track._cornerSpeed(curvature) : CONFIG.MAX_SPEED;

        // Adjust for skill
        targetSpeed *= (0.85 + this.car.skill * 0.15);

        // Reduce for wet conditions
        const weather = this.car.weather || 'DRY';
        const weatherType = CONFIG.WEATHER_TYPES[weather];
        targetSpeed *= weatherType.gripModifier;

        // Consider car ahead
        const carAhead = this._findCarAhead(allCars, 20);
        if (carAhead) {
            const dist = Utils.dist(this.car.x, this.car.y, carAhead.x, carAhead.y);
            const minFollowDist = 8 + this.car.speed * 0.15;
            if (dist < minFollowDist) {
                targetSpeed = Math.min(targetSpeed, carAhead.speed * 0.95);
            }
        }

        return targetSpeed;
    }

    _calculateThrottleBrake(targetSpeed) {
        const currentSpeed = this.car.speed;
        const speedDiff = targetSpeed - currentSpeed;

        let throttle = 0;
        let brake = 0;

        if (speedDiff > 2) {
            throttle = Utils.clamp(speedDiff / 15, 0, 1);
        } else if (speedDiff < -5) {
            brake = Utils.clamp(-speedDiff / 30, 0, 1);
            throttle = 0;
        } else if (speedDiff > 0) {
            throttle = Utils.clamp(speedDiff / 10, 0.3, 0.8);
        } else {
            throttle = 0.1; // slight throttle to maintain position
        }

        // Lift throttle before corners (braking point)
        const brakeTarget = this.track.getLookAheadPoint(this.car.currentWaypoint, this.car.speed * 0.5 + 40);
        const aheadCurvature = this.track.getCurvatureAt(brakeTarget.index || this.car.currentWaypoint);
        const cornerSpeed = this.track._cornerSpeed ? this.track._cornerSpeed(aheadCurvature) : CONFIG.MAX_SPEED;

        if (cornerSpeed < currentSpeed - 10) {
            const brakeFactor = Utils.clamp((currentSpeed - cornerSpeed) / 40, 0, 1);
            brake = Math.max(brake, brakeFactor * 0.9);
            throttle = Math.min(throttle, 0.1);
        }

        return { throttle, brake };
    }

    _shouldUseDRS() {
        return this.car.drsAvailable && !this.car.drsActive &&
               this.car.speed > 40;
    }

    _shouldUseERS(throttle) {
        // Use ERS when in a DRS zone or when overtaking
        return throttle > 0.7 && this.car.ersEnergy > CONFIG.ERS_MAX_ENERGY * 0.2;
    }

    _checkPitStop(raceTime) {
        const lap = this.car.currentLap;
        const tireWear = this.car.getAverageTireWear();
        const weather = this.car.weather;

        // Decision to pit
        let shouldPit = false;

        // Planned pit stop lap
        if (lap >= this.plannedPitLap && !this.hasCompletedPit && tireWear > 0.3) {
            shouldPit = true;
        }

        // Emergency pit on excessive wear
        if (tireWear > 0.85) {
            shouldPit = true;
        }

        // Wet to dry switch
        if (weather === 'DRY' && (this.car.tireCompound === 'WET' || this.car.tireCompound === 'INTERMEDIATE')) {
            shouldPit = true;
        }

        // Dry to wet switch
        if ((weather === 'HEAVY_RAIN' || weather === 'LIGHT_RAIN') &&
            (this.car.tireCompound === 'SOFT' || this.car.tireCompound === 'MEDIUM' || this.car.tireCompound === 'HARD')) {
            if (weather === 'HEAVY_RAIN') shouldPit = true;
        }

        if (shouldPit && !this.car.inPitLane) {
            this.car.pitRequested = true;
            // Choose new compound
            if (!this.pendingCompoundChoice) {
                this.pendingCompoundChoice = this._chooseNewCompound();
                this.car.pendingCompound = this.pendingCompoundChoice;
            }
        }
    }

    _chooseNewCompound() {
        const weather = this.car.weather;
        if (weather === 'HEAVY_RAIN') return 'WET';
        if (weather === 'LIGHT_RAIN') return 'INTERMEDIATE';

        const current = this.car.tireCompound;
        const lap = this.car.currentLap;
        const totalLaps = this.car.totalLaps;
        const remaining = totalLaps - lap;

        // Choose based on remaining laps
        if (remaining < 8) return 'SOFT';
        if (remaining < 15) return 'MEDIUM';
        return 'HARD';
    }
}

// AI Manager - handles all AI cars
class AIManager {
    constructor(track) {
        this.track = track;
        this.drivers = [];
    }

    addDriver(car) {
        this.drivers.push(new AIDriver(car, this.track));
    }

    update(allCars, dt, raceTime) {
        for (const driver of this.drivers) {
            driver.update(allCars, dt, raceTime);
        }
    }

    reset(track) {
        this.track = track;
        for (const driver of this.drivers) {
            driver.track = track;
            driver.targetWaypoint = 0;
            driver.overtakingTarget = null;
            driver.overtakeTimer = 0;
            driver.plannedPitLap = driver._planPitStop();
            driver.hasCompletedPit = false;
        }
    }
}
