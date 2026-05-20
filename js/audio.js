// Web Audio API - Procedural Engine Sound
class AudioSystem {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.engineOscillator = null;
        this.engineGain = null;
        this.harmOscillators = [];
        this.harmGains = [];
        this.noiseNode = null;
        this.noiseGain = null;
        this.tireSquealOsc = null;
        this.tireSquealGain = null;
        this.initialized = false;
        this.muted = false;
        this.masterVolume = 0.6;
        this.currentRPM = 5000;
        this.targetRPM = 5000;
    }

    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.context.destination);

            this._createEngineSound();
            this._createTireSqueal();
            this._createExhaustPops();
            this.initialized = true;
        } catch (e) {
            console.warn('Audio initialization failed:', e);
        }
    }

    _createEngineSound() {
        const ctx = this.context;

        // Main engine oscillator (fundamental)
        this.engineOscillator = ctx.createOscillator();
        this.engineOscillator.type = 'sawtooth';
        this.engineOscillator.frequency.value = CONFIG.ENGINE_BASE_FREQ;

        this.engineGain = ctx.createGain();
        this.engineGain.gain.value = 0.08;

        // Distortion for realism
        const distortion = ctx.createWaveShaper();
        distortion.curve = this._makeDistortionCurve(200);
        distortion.oversample = '4x';

        // Low-pass filter to shape engine sound
        const lowPass = ctx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 3000;
        lowPass.Q.value = 1.5;

        // High-pass filter
        const highPass = ctx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 80;

        this.engineOscillator.connect(this.engineGain);
        this.engineGain.connect(distortion);
        distortion.connect(lowPass);
        lowPass.connect(highPass);
        highPass.connect(this.masterGain);
        this.engineOscillator.start();

        // Harmonics (2nd, 3rd, 4th harmonic for richness)
        const harmonics = [2, 3, 4, 6, 8];
        const harmonicGains = [0.04, 0.02, 0.015, 0.008, 0.004];

        for (let i = 0; i < harmonics.length; i++) {
            const osc = ctx.createOscillator();
            osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
            osc.frequency.value = CONFIG.ENGINE_BASE_FREQ * harmonics[i];

            const gain = ctx.createGain();
            gain.gain.value = harmonicGains[i];

            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 4000;

            osc.connect(gain);
            gain.connect(lp);
            lp.connect(this.masterGain);
            osc.start();

            this.harmOscillators.push(osc);
            this.harmGains.push(gain);
        }

        // Noise for exhaust texture
        this.noiseGain = ctx.createGain();
        this.noiseGain.gain.value = 0;
        const noiseBuffer = this._createNoiseBuffer();
        this.noiseNode = ctx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        const noiseLowPass = ctx.createBiquadFilter();
        noiseLowPass.type = 'bandpass';
        noiseLowPass.frequency.value = 2000;
        noiseLowPass.Q.value = 0.8;

        this.noiseNode.connect(noiseLowPass);
        noiseLowPass.connect(this.noiseGain);
        this.noiseGain.connect(this.masterGain);
        this.noiseNode.start();
    }

    _createTireSqueal() {
        const ctx = this.context;

        this.tireSquealOsc = ctx.createOscillator();
        this.tireSquealOsc.type = 'sine';
        this.tireSquealOsc.frequency.value = 800;

        this.tireSquealGain = ctx.createGain();
        this.tireSquealGain.gain.value = 0;

        // Pitch modulation for realistic squeal
        const modOsc = ctx.createOscillator();
        modOsc.type = 'sine';
        modOsc.frequency.value = 15;
        const modGain = ctx.createGain();
        modGain.gain.value = 100;
        modOsc.connect(modGain);
        modGain.connect(this.tireSquealOsc.frequency);
        modOsc.start();

        const squealFilter = ctx.createBiquadFilter();
        squealFilter.type = 'bandpass';
        squealFilter.frequency.value = 900;
        squealFilter.Q.value = 3;

        this.tireSquealOsc.connect(squealFilter);
        squealFilter.connect(this.tireSquealGain);
        this.tireSquealGain.connect(this.masterGain);
        this.tireSquealOsc.start();
    }

    _createExhaustPops() {
        // Exhaust pops are handled via one-shot sounds
        this.lastExhaustPop = 0;
    }

    _makeDistortionCurve(amount) {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; ++i) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    _createNoiseBuffer() {
        const bufferSize = this.context.sampleRate * 2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    update(car, dt) {
        if (!this.initialized || this.muted) return;

        const rpm = car.rpm || CONFIG.MIN_RPM;
        const throttle = (car._aiInputs ? car._aiInputs.accelerate : 0) || car.throttle || 0;
        const speed = car.speed || 0;

        // Smooth RPM
        this.currentRPM = Utils.lerp(this.currentRPM, rpm, 0.15);

        // Engine frequency from RPM
        const rpmRatio = (this.currentRPM - CONFIG.MIN_RPM) / (CONFIG.MAX_RPM - CONFIG.MIN_RPM);
        const baseFreq = Utils.lerp(CONFIG.ENGINE_BASE_FREQ, CONFIG.ENGINE_MAX_FREQ, rpmRatio);

        // Update oscillators
        if (this.engineOscillator) {
            this.engineOscillator.frequency.setTargetAtTime(baseFreq, this.context.currentTime, 0.05);

            const harmonics = [2, 3, 4, 6, 8];
            for (let i = 0; i < this.harmOscillators.length; i++) {
                this.harmOscillators[i].frequency.setTargetAtTime(
                    baseFreq * harmonics[i], this.context.currentTime, 0.05
                );
            }
        }

        // Volume based on throttle
        const engineVol = 0.04 + throttle * 0.06 + rpmRatio * 0.03;
        if (this.engineGain) {
            this.engineGain.gain.setTargetAtTime(engineVol, this.context.currentTime, 0.05);
        }

        // Noise (exhaust/turbo) volume
        const noiseVol = throttle * 0.015 + rpmRatio * 0.01;
        if (this.noiseGain) {
            this.noiseGain.gain.setTargetAtTime(noiseVol, this.context.currentTime, 0.05);
        }

        // Tire squeal
        const lateralG = car.lateralG || 0;
        const squealVol = Utils.clamp((lateralG - 1.5) * 0.15, 0, 0.08);
        if (this.tireSquealGain) {
            this.tireSquealGain.gain.setTargetAtTime(squealVol, this.context.currentTime, 0.05);
            if (this.tireSquealOsc) {
                const squealFreq = 600 + speed * 3 + lateralG * 50;
                this.tireSquealOsc.frequency.setTargetAtTime(squealFreq, this.context.currentTime, 0.1);
            }
        }

        // Exhaust pop on gear change
        if (car.gearShiftTimer > 0 && car.gearShiftTimer < 0.05) {
            this._playExhaustPop();
        }
    }

    _playExhaustPop() {
        if (!this.initialized) return;
        const now = this.context.currentTime;
        if (now - this.lastExhaustPop < 0.1) return;
        this.lastExhaustPop = now;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        osc.type = 'square';
        osc.frequency.value = Utils.random(80, 150);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playCollision() {
        if (!this.initialized) return;
        const ctx = this.context;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.masterGain) {
            this.masterGain.gain.value = muted ? 0 : this.masterVolume;
        }
    }

    setVolume(vol) {
        this.masterVolume = vol;
        if (this.masterGain && !this.muted) {
            this.masterGain.gain.value = vol;
        }
    }

    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }
}
