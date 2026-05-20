// Weather System
class WeatherSystem {
    constructor() {
        this.currentWeather = 'DRY';
        this.targetWeather = 'DRY';
        this.transitionProgress = 0;
        this.transitionDuration = 120; // seconds
        this.transitionTimer = 0;
        this.isTransitioning = false;

        // Rain drops for visual effect
        this.rainDrops = [];
        this.maxRainDrops = 300;
        this.rainIntensity = 0;

        // Track drying model
        this.trackWetness = 0; // 0-1
        this.dryingRate = 0.001;
        this.wettingRate = 0.003;
    }

    setWeather(weather) {
        this.currentWeather = weather;
        this.targetWeather = weather;
        const weatherType = CONFIG.WEATHER_TYPES[weather];
        this.rainIntensity = weatherType.rainIntensity;
        this.trackWetness = this.rainIntensity > 0 ? this.rainIntensity : 0;
        this._initRainDrops();
    }

    startTransition(targetWeather, duration) {
        this.targetWeather = targetWeather;
        this.transitionDuration = duration || 120;
        this.transitionTimer = 0;
        this.isTransitioning = true;
    }

    _initRainDrops() {
        this.rainDrops = [];
        const count = Math.floor(this.maxRainDrops * this.rainIntensity);
        for (let i = 0; i < count; i++) {
            this.rainDrops.push(this._createRainDrop(Math.random() * 1280, Math.random() * 720));
        }
    }

    _createRainDrop(x, y) {
        return {
            x: x,
            y: y,
            vx: Utils.random(-1, 1),
            vy: Utils.random(8, 15) * (1 + this.rainIntensity),
            length: Utils.random(5, 15),
            alpha: Utils.random(0.3, 0.7),
            life: 1
        };
    }

    update(dt) {
        // Handle weather transitions
        if (this.isTransitioning) {
            this.transitionTimer += dt;
            const t = this.transitionTimer / this.transitionDuration;
            if (t >= 1) {
                this.currentWeather = this.targetWeather;
                this.isTransitioning = false;
                this.transitionProgress = 1;
            } else {
                this.transitionProgress = t;
            }
        }

        // Update rain intensity
        const currentType = CONFIG.WEATHER_TYPES[this.currentWeather];
        const targetType = CONFIG.WEATHER_TYPES[this.targetWeather];
        const blendT = this.isTransitioning ? this.transitionProgress : 1;
        this.rainIntensity = Utils.lerp(
            currentType.rainIntensity,
            targetType.rainIntensity,
            blendT
        );

        // Update track wetness
        if (this.rainIntensity > 0) {
            this.trackWetness = Math.min(1, this.trackWetness + this.wettingRate * dt * this.rainIntensity * 60);
        } else {
            this.trackWetness = Math.max(0, this.trackWetness - this.dryingRate * dt * 60);
        }

        // Update rain drops
        this._updateRainDrops(dt);
    }

    _updateRainDrops(dt) {
        const targetCount = Math.floor(this.maxRainDrops * this.rainIntensity);

        // Add new drops
        while (this.rainDrops.length < targetCount) {
            this.rainDrops.push(this._createRainDrop(
                Math.random() * 1280,
                -10
            ));
        }

        // Remove excess drops
        while (this.rainDrops.length > targetCount) {
            this.rainDrops.pop();
        }

        // Update positions
        for (let i = this.rainDrops.length - 1; i >= 0; i--) {
            const drop = this.rainDrops[i];
            drop.x += drop.vx;
            drop.y += drop.vy;

            if (drop.y > 730) {
                drop.x = Math.random() * 1280;
                drop.y = -10;
            }
        }
    }

    getGripModifier() {
        const currentType = CONFIG.WEATHER_TYPES[this.currentWeather];
        if (!this.isTransitioning) return currentType.gripModifier;

        const targetType = CONFIG.WEATHER_TYPES[this.targetWeather];
        return Utils.lerp(currentType.gripModifier, targetType.gripModifier, this.transitionProgress);
    }

    getRecommendedCompound() {
        if (this.rainIntensity > 0.7) return 'WET';
        if (this.rainIntensity > 0.2) return 'INTERMEDIATE';
        return null; // Any dry compound
    }

    shouldTriggerSafetyCarWeather() {
        return this.rainIntensity > 0.8 && this.trackWetness > 0.7;
    }

    getWeatherName() {
        if (this.isTransitioning) {
            const current = CONFIG.WEATHER_TYPES[this.currentWeather].name;
            const target = CONFIG.WEATHER_TYPES[this.targetWeather].name;
            return `${current} → ${target}`;
        }
        return CONFIG.WEATHER_TYPES[this.currentWeather].name;
    }
}
