const AUDIO_ASSETS = {
  bgm: '/assets/audio/bgm-garden-loop.wav',
  click: '/assets/audio/ui-click.wav',
  water: '/assets/audio/water.wav',
  fertilize: '/assets/audio/fertilize.wav',
  pest: '/assets/audio/pest.wav',
  alert: '/assets/audio/alert.wav',
  levelUp: '/assets/audio/level-up.wav',
};

const VOLUMES = {
  bgm: 0.18,
  click: 0.38,
  water: 0.48,
  fertilize: 0.46,
  pest: 0.34,
  alert: 0.42,
  levelUp: 0.5,
};

export const audio = {
  ctx: null,
  buffers: {},
  loadPromise: null,
  bgmSource: null,
  bgmGain: null,
  isMuted: true,

  init() {
    if (this.ctx) return true;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return false;
    this.ctx = new AudioCtor();
    this.loadAssets();
    return true;
  },

  loadAssets() {
    if (!this.ctx || this.loadPromise) return this.loadPromise;

    this.loadPromise = Promise.all(
      Object.entries(AUDIO_ASSETS).map(async ([key, url]) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Unable to load audio asset: ${url}`);
        const data = await response.arrayBuffer();
        this.buffers[key] = await this.ctx.decodeAudioData(data);
      })
    ).catch(error => {
      console.warn('Audio assets failed to load.', error);
      this.loadPromise = null;
    });

    return this.loadPromise;
  },

  setMuted(mute) {
    this.isMuted = mute;
    if (mute) {
      this.stopBgm();
      return;
    }

    this.init();
    this.resume();
    this.startBgm();
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  startBgm() {
    if (this.isMuted || this.bgmSource) return;
    if (!this.init()) return;

    const bgmBuffer = this.buffers.bgm;
    if (!bgmBuffer) {
      this.loadAssets()?.then(() => {
        if (!this.isMuted) this.startBgm();
      });
      return;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = bgmBuffer;
    source.loop = true;
    gain.gain.value = VOLUMES.bgm;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();

    this.bgmSource = source;
    this.bgmGain = gain;
  },

  stopBgm() {
    if (this.bgmSource) {
      try {
        this.bgmSource.stop();
      } catch (error) {
        console.warn('BGM stop failed.', error);
      }
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }

    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
  },

  playAsset(key) {
    if (this.isMuted) return;
    if (!this.init()) return;
    this.resume();

    const buffer = this.buffers[key];
    if (!buffer) {
      this.loadAssets();
      return;
    }

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = VOLUMES[key] ?? 0.45;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  },

  playClick() {
    this.playAsset('click');
  },

  playAlert() {
    this.playAsset('alert');
  },

  playWater() {
    this.playAsset('water');
  },

  playPest() {
    this.playAsset('pest');
  },

  playFertilize() {
    this.playAsset('fertilize');
  },

  playLevelUp() {
    this.playAsset('levelUp');
  },
};
