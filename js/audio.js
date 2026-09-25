/** Web Audio API — procedural ambience & stings for Static Hours */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambGain = null;
    this.sfxGain = null;
    this.masterVol = 0.7;
    this.ambVol = 0.6;
    this.muted = false;
    this._nodes = {};
    this._heartRate = 0;
    this._started = false;
  }

  async ensure() {
    if (this._started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVol;
    this.master.connect(this.ctx.destination);

    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = this.ambVol;
    this.ambGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 1;
    this.sfxGain.connect(this.master);

    this._started = true;
    if (this.ctx.state === 'suspended') {
      try {
        await Promise.race([
          this.ctx.resume(),
          new Promise((r) => setTimeout(r, 400)),
        ]);
      } catch (_) {}
    }
    this._startAmbience();
  }

  setMaster(v) {
    this.masterVol = v;
    if (this.master) this.master.gain.value = this.muted ? 0 : v;
  }
  setAmb(v) {
    this.ambVol = v;
    if (this.ambGain) this.ambGain.gain.value = v;
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : this.masterVol;
  }

  _noiseBuffer(seconds = 2) {
    const sr = this.ctx.sampleRate;
    const len = sr * seconds;
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _startAmbience() {
    // Low hum
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const humGain = this.ctx.createGain();
    humGain.gain.value = 0.04;
    osc.connect(humGain);
    humGain.connect(this.ambGain);
    osc.start();
    this._nodes.hum = { osc, gain: humGain };

    // Rain-ish filtered noise
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(4);
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.4;
    const rainGain = this.ctx.createGain();
    rainGain.gain.value = 0.035;
    src.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(this.ambGain);
    src.start();
    this._nodes.rain = { src, gain: rainGain, filter };

    // Occasional distant thunder rumble via LFO on hum
    this._scheduleCreak();
  }

  _scheduleCreak() {
    if (!this._started) return;
    const delay = 8 + Math.random() * 18;
    this._creakTimer = setTimeout(() => {
      this.creak();
      this._scheduleCreak();
    }, delay * 1000);
  }

  click() {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.value = 800;
    o.type = 'square';
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.07);
  }

  creak() {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(90 + Math.random() * 40, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    o.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.55);
  }

  footstep(sprint = false) {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = sprint ? 70 : 55;
    g.gain.setValueAtTime(sprint ? 0.05 : 0.03, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.09);
  }

  heartBeat() {
    if (!this._started || this._heartRate <= 0) return;
    const t = this.ctx.currentTime;
    const beat = (offset, freq) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, t + offset);
      g.gain.exponentialRampToValueAtTime(0.09 * this._heartRate, t + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.15);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t + offset);
      o.stop(t + offset + 0.18);
    };
    beat(0, 45);
    beat(0.18, 55);
  }

  setFear(level) {
    this._heartRate = Math.max(0, Math.min(1, level));
    if (this._heartTimer) clearInterval(this._heartTimer);
    if (level > 0.15) {
      const interval = 900 - level * 500;
      this._heartTimer = setInterval(() => this.heartBeat(), interval);
    }
  }

  sting() {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    // Dissonant stab
    [110, 116, 165].forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(2000, t);
      f.frequency.exponentialRampToValueAtTime(200, t + 0.6);
      o.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      o.start(t + i * 0.01);
      o.stop(t + 0.85);
    });
    // Noise burst
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(0.3);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.15, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    src.connect(ng);
    ng.connect(this.sfxGain);
    src.start(t);
    src.stop(t + 0.3);
  }

  doorOpen() {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, t);
    o.frequency.linearRampToValueAtTime(90, t + 0.35);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.45);
  }

  doorLocked() {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.value = 140;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.15);
  }

  pickup() {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.1);
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.16);
  }

  radioStatic(on) {
    if (!this._started) return;
    if (this._nodes.radio) {
      try { this._nodes.radio.src.stop(); } catch (_) {}
      this._nodes.radio = null;
    }
    if (!on) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(2);
    src.loop = true;
    const g = this.ctx.createGain();
    g.gain.value = 0.08;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 800;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start();
    this._nodes.radio = { src, gain: g };
  }

  whisper() {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(1);
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1500;
    f.Q.value = 5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + 1.3);
  }

  knock() {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 60;
      const tt = t + i * 0.28;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.2, tt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.2);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(tt);
      o.stop(tt + 0.25);
    }
  }

  powerOn() {
    if (!this._started) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(80, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + 0.55);
  }
}
