// Original, synthesized ambient music. The audio graph starts only after a user gesture.
export class RoomAudio{
  constructor() {
    this.level = 0;
    this.enabled = false;
    this.timer = 0;
  }
  unlock() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext)return false;
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1700;
        filter.Q.value = .45;
        filter.connect(this.master);
        this.filter = filter;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended')this.ctx.resume().catch (() => {});
      this.enabled = true;
      return true;
    } catch{
      return false;
    }
  }
  set(level, gesture = false) {
    this.level = level;
    if (gesture && level>0)this.unlock();
    if (!this.ctx)return;
    this.master.gain.setTargetAtTime(Math.pow(level/100, 1.4)*.24, this.ctx.currentTime, .09);
    if (!level) {
      clearTimeout(this.timer);
      this.timer = 0;
      return;
    }
    if (!this.timer && this.enabled)this.play();
  }
  play() {
    if (!this.ctx || !this.level || !this.enabled)return;
    const ctx = this.ctx, now = ctx.currentTime, chords = [[146.83, 220, 277.18, 329.63], [130.81, 196, 261.63, 329.63], [110, 164.81, 220, 293.66], [123.47, 185, 246.94, 293.66]], chord = chords[(this.step || 0)%chords.length];
    (this.step??=0);
    this.step++;
    chord.forEach((hz, i) => {
      const t = now+.04+i*.19, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i === 0?'sine':'triangle';
      o.frequency.value = hz;
      o.detune.value = i%2 === 0?-2:2;
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(i? .042:.09, t+.53);
      g.gain.exponentialRampToValueAtTime(.0001, t+4.5);
      o.connect(g);
      g.connect(this.filter);
      o.start(t);
      o.stop(t+4.6);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    });
    this.timer = setTimeout(() => {
      this.timer = 0;
      this.play();
    }, 3300);
  }
}
