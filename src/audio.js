// Web Audio API Synthesis for Romantic Wedding Music & AR Sound Effects
// 100% self-contained, no external mp3 files required, zero CORS or loading lag!

class WeddingAudioManager {
  constructor() {
    this.ctx = null;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.stepIndex = 0;
    this.masterGain = null;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMusic() {
    this.init();
    if (this.isPlayingMusic) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  // Romantic acoustic harp & bell arpeggios (Key of D Major / Canon in D inspired romantic chords)
  startMusic() {
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;

    // Chord progression: D - A - Bm - F#m - G - D - G - A (Canon in D chords)
    const chords = [
      [146.83, 220.00, 293.66, 369.99, 440.00, 587.33], // D major
      [110.00, 164.81, 220.00, 277.18, 329.63, 440.00], // A major
      [123.47, 185.00, 246.94, 293.66, 369.99, 493.88], // B minor
      [92.50, 138.59, 185.00, 220.00, 277.18, 369.99],  // F# minor
      [98.00, 146.83, 196.00, 246.94, 293.66, 392.00],  // G major
      [146.83, 220.00, 293.66, 369.99, 440.00, 587.33], // D major
      [98.00, 146.83, 196.00, 246.94, 293.66, 392.00],  // G major
      [110.00, 164.81, 220.00, 277.18, 329.63, 440.00]  // A major
    ];

    let chordIdx = 0;
    let noteInChord = 0;

    const playNextNote = () => {
      if (!this.isPlayingMusic || !this.ctx) return;

      const currentChord = chords[chordIdx];
      const freq = currentChord[noteInChord];

      // Play soft celesta/harp chime note
      this.playRomanticChime(freq, 1.8, 0.12);

      // Play a soft background warm pad tone on first beat
      if (noteInChord === 0) {
        this.playWarmPad(currentChord[0] * 0.5, 3.2, 0.08);
      }

      noteInChord++;
      if (noteInChord >= currentChord.length) {
        noteInChord = 0;
        chordIdx = (chordIdx + 1) % chords.length;
      }

      // Schedule next gentle arpeggio note (around 450ms rhythm)
      this.musicTimer = setTimeout(playNextNote, 420);
    };

    playNextNote();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  playRomanticChime(freq, duration = 1.5, volume = 0.15) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Subtle overtone for sparkle
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + duration);
    osc2.stop(now + duration);
  }

  playWarmPad(freq, duration = 3.5, volume = 0.08) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // SFX: Blooming flower magical flourish
  playBloomSfx() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const notes = [392, 493.88, 587.33, 739.99, 880, 1046.50, 1174.66];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playRomanticChime(f, 1.2, 0.15);
      }, i * 90);
    });
  }

  // SFX: Diamond ring shimmer
  playRingShimmer() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const glints = [1318.5, 1567.98, 2093.0];
    glints.forEach((f, i) => {
      setTimeout(() => {
        this.playRomanticChime(f, 0.8, 0.12);
      }, i * 70);
    });
  }

  // SFX: Butterfly wing flutter / tap spawn
  playButterflyFlutter() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const notes = [587.33, 880, 1174.66];
    notes.forEach((f, i) => {
      setTimeout(() => {
        this.playRomanticChime(f, 0.6, 0.09);
      }, i * 50);
    });
  }

  // SFX: Wish sent celebratory chime
  playWishSent() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const fanfare = [587.33, 739.99, 880, 1174.66, 1479.98];
    fanfare.forEach((f, i) => {
      setTimeout(() => {
        this.playRomanticChime(f, 1.4, 0.18);
      }, i * 110);
    });
  }
}

export const weddingAudio = new WeddingAudioManager();
