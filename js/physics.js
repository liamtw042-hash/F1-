// F1 Physics Engine
// Implements Pacejka tire model, aerodynamics, ERS, DRS, fuel load

class Physics {
    constructor() {
        this.dt = CONFIG.PHYSICS_TIMESTEP;
    }

    // Main physics update - returns new car state
    update(car, inputs, track, dt) {
        dt = dt || this.dt;

        // Get tire compound properties
        const compound = CONFIG.TIRE_COMPOUNDS[car.tireCompound];
        const weatherType = CONFIG.WEATHER_TYPES[car.weather || 'DRY'];

        // Calculate current car mass (with fuel)
        const carMass = CONFIG.CAR_MASS + car.fuel;

        // Transform velocity to local car frame
        const cosA = Math.cos(car.angle);
        const sinA = Math.sin(car.angle);
        const vx_local = car.vx * cosA + car.vy * sinA;
        const vy_local = -car.vx * sinA + car.vy * cosA;

        // Current speed
        const speed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);

        // --- GEAR LOGIC ---
        if (car.gearShiftTimer > 0) car.gearShiftTimer -= dt;
        this._updateGear(car, vx_local);

        // --- ENGINE FORCE ---
        const engineForce = this._calculateEngineForce(car, inputs, vx_local);

        // --- BRAKE FORCE ---
        const brakeForce = this._calculateBrakeForce(car, inputs, speed);

        // --- AERODYNAMICS ---
        const aero = this._calculateAero(car, speed);

        // --- TIRE FORCES ---
        const tireForces = this._calculateTireForces(car, inputs, vx_local, vy_local, speed, compound, weatherType, aero.downforce, carMass);

        // --- TOTAL FORCES ---
        const Fx_local = engineForce - brakeForce - aero.drag + tireForces.Fx;
        const Fy_local = tireForces.Fy;

        // Transform forces back to world frame
        const Fx_world = Fx_local * cosA - Fy_local * sinA;
        const Fy_world = Fx_local * sinA + Fy_local * cosA;

        // --- INTEGRATE VELOCITY ---
        const ax = Fx_world / carMass;
        const ay = Fy_world / carMass;

        car.vx += ax * dt;
        car.vy += ay * dt;

        // Speed limiter
        const newSpeed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
        if (newSpeed > CONFIG.MAX_SPEED) {
            car.vx = (car.vx / newSpeed) * CONFIG.MAX_SPEED;
            car.vy = (car.vy / newSpeed) * CONFIG.MAX_SPEED;
        }

        // --- ANGULAR VELOCITY ---
        this._updateAngularVelocity(car, inputs, vx_local, vy_local, speed, tireForces, dt);

        // --- INTEGRATE POSITION ---
        car.x += car.vx * dt;
        car.y += car.vy * dt;
        car.angle += car.angularVelocity * dt;
        car.angle = Utils.normalizeAngle(car.angle);

        // --- UPDATE SPEED ---
        car.speed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
        car.speedKmh = Utils.msToKmh(car.speed);

        // --- UPDATE RPM ---
        this._updateRPM(car, vx_local);

        // --- UPDATE ERS ---
        this._updateERS(car, inputs, brakeForce, speed, dt);

        // --- UPDATE FUEL ---
        if (car.speed > 1) {
            const fuelRate = (CONFIG.FUEL_PER_LAP / (car.lapTime || 90)) * dt;
            car.fuel = Math.max(0, car.fuel - fuelRate);
        }

        // --- UPDATE TIRES ---
        this._updateTires(car, tireForces, speed, compound, weatherType, dt);

        // --- UPDATE DRS ---
        this._updateDRS(car, inputs);

        // --- WHEELSPIN DETECTION ---
        car.wheelSpin = engineForce > 0 && Math.abs(tireForces.longitudinalSlip) > 0.3;
        car.lockup = inputs.brake > 0.5 && Math.abs(tireForces.longitudinalSlip) > 0.25;
        car.lateralG = Math.abs(vy_local) > 0.1 ? Math.abs(tireForces.Fy) / (carMass * 9.81) : 0;

        return car;
    }

    _updateGear(car, vx_local) {
        const ratios = CONFIG.GEAR_RATIOS;
        const finalDrive = CONFIG.FINAL_DRIVE;
        const wheelCircumference = 2.0; // meters

        if (car.gear === 0) car.gear = 1;

        // Auto shift up
        if (car.rpm > 13500 && car.gear < 8) {
            car.gear++;
            car.gearShiftTimer = 0.05; // 50ms shift time
        }
        // Auto shift down
        if (car.rpm < 7000 && car.gear > 1) {
            car.gear--;
        }
    }

    _calculateEngineForce(car, inputs, vx_local) {
        const throttle = inputs.accelerate || 0;
        if (throttle <= 0) return 0;

        const ratio = CONFIG.GEAR_RATIOS[car.gear] * CONFIG.FINAL_DRIVE;
        const wheelRadius = 0.33; // meters

        // Torque curve - simplified peak torque around 10000-12000 RPM
        const rpmNorm = Utils.clamp((car.rpm - CONFIG.MIN_RPM) / (CONFIG.MAX_RPM - CONFIG.MIN_RPM), 0, 1);
        const torqueCurve = this._torqueCurve(rpmNorm);

        let power = CONFIG.ENGINE_POWER * throttle * torqueCurve;

        // ERS deployment boost
        if (car.ersDeploying && car.ersEnergy > 0) {
            power += CONFIG.ERS_DEPLOY_BOOST;
        }

        // Convert power to force at wheels
        const vForce = Math.max(vx_local, 1.0);
        let force = power / vForce;

        // Apply traction limit based on grip
        const maxTraction = 15000; // N
        force = Math.min(force, maxTraction);

        return force * throttle;
    }

    _torqueCurve(rpmNorm) {
        // Simulated torque curve - peaks at ~0.65 (10000 RPM)
        if (rpmNorm < 0.2) return 0.6 + rpmNorm * 2.0;
        if (rpmNorm < 0.65) return Utils.lerp(1.0, 1.0, (rpmNorm - 0.2) / 0.45);
        return 1.0 - (rpmNorm - 0.65) * 0.8;
    }

    _calculateBrakeForce(car, inputs, speed) {
        const brake = inputs.brake || 0;
        if (brake <= 0) return 0;

        // Max brake force ~18000 N
        const maxBrakeForce = 18000;

        // ABS simulation - prevent full lockup
        const absEffect = speed > 5 ? 1.0 : speed / 5;
        return maxBrakeForce * brake * absEffect;
    }

    _calculateAero(car, speed) {
        const density = CONFIG.AIR_DENSITY;
        const vSq = speed * speed;

        // Drag force: Fd = 0.5 * Cd * rho * A * v^2
        let Cd = CONFIG.DRAG_COEFFICIENT;
        if (car.drsActive) Cd *= (1 - CONFIG.DRS_DRAG_REDUCTION);

        const drag = 0.5 * Cd * density * CONFIG.CAR_FRONTAL_AREA * vSq;

        // Downforce: Fl = 0.5 * Cl * rho * A * v^2
        const downforce = 0.5 * CONFIG.DOWNFORCE_COEFFICIENT * density * CONFIG.CAR_PLAN_AREA * vSq;

        return { drag, downforce };
    }

    _calculateTireForces(car, inputs, vx_local, vy_local, speed, compound, weatherType, downforce, carMass) {
        const P = CONFIG.PACEJKA;

        // Grip factors
        const tireWearFactor = this._tireWearGrip(car);
        const tempFactor = this._tireTempGrip(car, compound);
        const rainFactor = weatherType.gripModifier;

        let gripMultiplier = compound.gripMultiplier * tireWearFactor * tempFactor * rainFactor;

        // Normal force per axle
        const gravity = 9.81;
        const totalNormal = carMass * gravity + downforce;
        const frontNormal = totalNormal * 0.45; // 45% front
        const rearNormal = totalNormal * 0.55;  // 55% rear

        // Steering angle in radians
        const steerAngle = (inputs.steer || 0) * 0.35; // max ~20 degrees

        // Slip angles
        const vxSafe = Math.max(Math.abs(vx_local), 0.5) * Math.sign(vx_local || 1);
        const slipAngleFront = Math.atan2(vy_local + car.angularVelocity * 1.5, Math.abs(vxSafe)) - steerAngle;
        const slipAngleRear = Math.atan2(vy_local - car.angularVelocity * 1.5, Math.abs(vxSafe));

        // Longitudinal slip ratio
        const longitudinalSlip = vx_local > 0.5 ?
            (car.wheelSpeed - vx_local) / Math.max(vx_local, 1) :
            0;

        // Pacejka lateral forces
        const Fy_front = Utils.pacejka(slipAngleFront, P.B, P.C, P.D * frontNormal * gripMultiplier, P.E);
        const Fy_rear = Utils.pacejka(slipAngleRear, P.B, P.C, P.D * rearNormal * gripMultiplier, P.E);

        // Combined lateral force in car frame
        const Fy = (Fy_front + Fy_rear);

        // Longitudinal force (simplified)
        const Fx = Utils.pacejka(longitudinalSlip * 5, P.B, P.C, P.D * totalNormal * 0.3 * gripMultiplier, P.E) * 200;

        return { Fy: -Fy, Fx, longitudinalSlip, slipAngleFront, slipAngleRear, totalNormal };
    }

    _updateAngularVelocity(car, inputs, vx_local, vy_local, speed, tireForces, dt) {
        if (speed < 0.5) {
            car.angularVelocity *= 0.9;
            return;
        }

        const steerAngle = (inputs.steer || 0) * 0.35;
        const slipAngleFront = tireForces.slipAngleFront;

        // Yaw moment from tire forces
        const wheelbase = 3.6; // meters
        const frontAxleDist = 1.8;
        const rearAxleDist = 1.8;

        // Simplified yaw torque
        const yawTorque = -tireForces.Fy * 0.5;

        // Inertia (moment of inertia around yaw axis)
        const inertia = 450; // kg*m^2

        const yawAccel = yawTorque / inertia;
        car.angularVelocity += yawAccel * dt;

        // Damping
        const dampingFactor = speed > 10 ? 0.92 : 0.85;
        car.angularVelocity *= dampingFactor;

        // Steering input effect
        const steerEffect = steerAngle * speed * 0.018;
        car.angularVelocity += steerEffect * dt * 60;

        // Clamp angular velocity
        const maxYaw = 2.5;
        car.angularVelocity = Utils.clamp(car.angularVelocity, -maxYaw, maxYaw);
    }

    _updateRPM(car, vx_local) {
        const ratio = CONFIG.GEAR_RATIOS[car.gear] * CONFIG.FINAL_DRIVE;
        const wheelRadius = 0.33;
        const vForce = Math.max(vx_local, 0);

        // Calculate theoretical RPM from wheel speed
        car.wheelSpeed = vForce;
        const wheelRPM = (vForce / (2 * Math.PI * wheelRadius)) * 60;
        const theoreticalRPM = wheelRPM * ratio;

        // Smooth RPM update
        const targetRPM = Utils.clamp(theoreticalRPM, CONFIG.MIN_RPM, CONFIG.MAX_RPM);
        car.rpm = Utils.lerp(car.rpm, targetRPM, 0.3);
        car.rpm = Utils.clamp(car.rpm, CONFIG.MIN_RPM, CONFIG.MAX_RPM);
    }

    _updateERS(car, inputs, brakeForce, speed, dt) {
        // Harvest under braking
        if (inputs.brake > 0.3 && speed > 10) {
            const harvestAmount = CONFIG.ERS_HARVEST_RATE * inputs.brake * dt;
            car.ersEnergy = Math.min(CONFIG.ERS_MAX_ENERGY, car.ersEnergy + harvestAmount);
        }

        // ERS harvest from MGU-H (engine braking at high RPM)
        if (car.rpm > 11000 && inputs.accelerate < 0.3) {
            const mguHHarvest = CONFIG.ERS_HARVEST_RATE * 0.5 * dt;
            car.ersEnergy = Math.min(CONFIG.ERS_MAX_ENERGY, car.ersEnergy + mguHHarvest);
        }

        // Deploy ERS
        car.ersDeploying = inputs.ers && car.ersEnergy > 0;
        if (car.ersDeploying) {
            car.ersEnergy = Math.max(0, car.ersEnergy - CONFIG.ERS_DEPLOY_RATE * dt);
        }
    }

    _updateTires(car, tireForces, speed, compound, weatherType, dt) {
        // Tire temperature model
        const ambientTemp = weatherType.rainIntensity > 0 ? 15 : 25;
        const optimalTemp = compound.optimalTemp;

        // Heat generation from lateral and longitudinal forces
        const lateralHeat = Math.abs(tireForces.Fy) * speed * 0.000001;
        const longHeat = Math.abs(tireForces.Fx) * speed * 0.0000008;
        const totalHeat = lateralHeat + longHeat;

        // Cooling
        const coolingRate = 0.02;

        for (let i = 0; i < 4; i++) {
            // Heat each tire
            car.tireTemp[i] += totalHeat * (i < 2 ? 0.9 : 1.1); // rears run hotter
            // Cool towards ambient
            car.tireTemp[i] += (ambientTemp - car.tireTemp[i]) * coolingRate * dt;
            car.tireTemp[i] = Utils.clamp(car.tireTemp[i], ambientTemp, 130);

            // Tire wear
            const tempWearBonus = Math.max(0, (car.tireTemp[i] - optimalTemp - 10) / 50);
            const lateralWear = Math.abs(tireForces.Fy) * speed * 0.0000000015 * compound.wearRate;
            const longWear = Math.abs(tireForces.Fx) * speed * 0.0000000008 * compound.wearRate;
            const tempWear = tempWearBonus * 0.00002 * compound.wearRate;

            car.tireWear[i] = Math.min(1.0, car.tireWear[i] + (lateralWear + longWear + tempWear) * dt);
        }
    }

    _tireWearGrip(car) {
        const avgWear = (car.tireWear[0] + car.tireWear[1] + car.tireWear[2] + car.tireWear[3]) / 4;
        // Grip decreases more steeply after 70% wear
        if (avgWear < 0.7) return 1.0 - avgWear * 0.2;
        return 1.0 - 0.14 - (avgWear - 0.7) * 0.8;
    }

    _tireTempGrip(car, compound) {
        const avgTemp = (car.tireTemp[0] + car.tireTemp[1] + car.tireTemp[2] + car.tireTemp[3]) / 4;
        const tempDiff = Math.abs(avgTemp - compound.optimalTemp);
        const tempRange = compound.tempRange;
        if (tempDiff <= tempRange) return 1.0;
        return Math.max(0.5, 1.0 - (tempDiff - tempRange) * 0.02);
    }

    _updateDRS(car, inputs) {
        if (inputs.drs && car.drsAvailable && !car.drsActive) {
            car.drsActive = true;
        } else if (!car.drsAvailable) {
            car.drsActive = false;
        }
    }
}
