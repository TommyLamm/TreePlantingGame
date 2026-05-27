export const audio = {
  ctx: null,
  bgmNodes: [],
  isMuted: true,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  setMuted(mute) {
    this.isMuted = mute;
    if (this.ctx && this.ctx.state === 'suspended' && !mute) {
      this.ctx.resume();
    }
    if (mute) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
  },

  startBgm() {
    if (this.bgmNodes.length > 0) return;
    this.init();

    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 0;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.15;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 300;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
    lfo.start();

    this.bgmNodes.push({ osc: noise, lfo: lfo, nodes: [filter, gain, lfoGain] });
  },

  stopBgm() {
    this.bgmNodes.forEach(n => {
      try {
        if (n.osc) n.osc.stop();
        if (n.lfo) n.lfo.stop();
        if (n.osc) n.osc.disconnect();
        if (n.lfo) n.lfo.disconnect();
        if (n.nodes) n.nodes.forEach(node => node.disconnect());
      } catch (e) {
        console.error(e);
      }
    });
    this.bgmNodes = [];
  },

  playTone(freq, type, duration, vol = 0.1) {
    if (this.isMuted) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.stop(this.ctx.currentTime + duration);
  },

  playClick() {
    this.playTone(600, 'triangle', 0.1, 0.05);
  },

  playAlert() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(392.00, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.setTargetAtTime(0, now + 0.5, 0.1);
    osc.start();
    osc.stop(now + 1.0);
  },

  playWater() {
    if (this.isMuted) return;
    this.init();

    const bufferSize = this.ctx.sampleRate * 1.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = this.ctx.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.8);
    noise.start();
  },

  playPest() {
    if (this.isMuted) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 150;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 30;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  },

  playFertilize() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      const start = now + (i * 0.05);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.05, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.start(start);
      osc.stop(start + 0.6);
    });
  },

  playLevelUp() {
    if (this.isMuted) return;
    this.init();

    const now = this.ctx.currentTime;
    [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      gain.gain.setValueAtTime(0.05, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      osc.start(now + i * 0.1);
      osc.stop(now + 2.0);
    });
  }
};
