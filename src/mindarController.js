import { weddingLights } from './weddingLights.js';
import { weddingAudio } from './audio.js';
import { LivingPhotoEngine } from './livingPhotoEngine.js';

// Register custom A-Frame component to force WebGL video texture frame upload on every render tick
if (typeof window !== 'undefined' && typeof window.AFRAME !== 'undefined' && !window.AFRAME.components['ar-video-sync']) {
  window.AFRAME.registerComponent('ar-video-sync', {
    init: function () {
      this.video = document.getElementById('custom-wedding-video');
    },
    tick: function () {
      if (this.video && !this.video.paused && this.video.readyState >= 2) {
        const mesh = this.el.getObject3D('mesh');
        if (mesh && mesh.material && mesh.material.map) {
          mesh.material.map.needsUpdate = true;
        }
      }
    }
  });
}

/**
 * MindARController
 * Powers real computer vision Image Target WebAR tracking like Stories AR!
 * Tracks target photo (/card.mind) and brings the image to life as moving video.
 */
export class MindARController {
  constructor(coupleName = 'Arif & Fatikhah') {
    let cleanName = coupleName || 'Arif & Fatikhah';
    try {
      cleanName = decodeURIComponent(cleanName);
      if (cleanName.includes('%')) cleanName = decodeURIComponent(cleanName);
    } catch (e) {}
    cleanName = cleanName.replace(/%26/g, '&').replace(/%20/g, ' ').replace(/\+/g, ' ');
    cleanName = cleanName.replace(/haziqah/gi, 'Fatikhah');
    this._coupleName = cleanName.trim() || 'Arif & Fatikhah';
    this.sceneContainer = document.getElementById('mindar-scene-container');
    this.sceneEl = document.getElementById('mindar-scene');
    this.targetEl = document.getElementById('mindar-target');
    this.livingPlaneEl = document.getElementById('ar-living-plane');
    this.bannerPlaneEl = document.getElementById('ar-floating-banner');
    this.namesPlaneEl = document.getElementById('ar-floating-names');
    this.videoEl = document.getElementById('custom-wedding-video');
    this.stillPlaneEl = document.getElementById('ar-still-photo-plane');
    this.shimmerPlaneEl = document.getElementById('ar-shimmer-plane');
    this.borderPlaneEl = document.getElementById('ar-gold-border');
    this.fadeAnimId = null;

    this.livingEngine = new LivingPhotoEngine('living-photo-canvas');
    this.isTracking = false;
    this.isTargetFound = false;
    this.isSoundActive = false; // By default sound is OFF (muted) as requested
    this.videoTextureAnimId = null;
    this.initVideoElement();
    this.initTextureCanvases();
    this.setupListeners();
    this.startVideoTextureLoop();
  }

  set coupleName(val) {
    let clean = val || 'Arif & Fatikhah';
    try {
      clean = decodeURIComponent(clean);
      if (clean.includes('%')) clean = decodeURIComponent(clean);
    } catch (e) {}
    clean = clean.replace(/%26/g, '&').replace(/%20/g, ' ').replace(/\+/g, ' ').replace(/haziqah/gi, 'Fatikhah');
    this._coupleName = clean.trim() || 'Arif & Fatikhah';
  }

  get coupleName() {
    return this._coupleName || 'Arif & Fatikhah';
  }

  primeVideo() {
    if (!this.videoEl) {
      this.videoEl = document.getElementById('custom-wedding-video');
    }
    weddingAudio.init();

    if (this.videoEl) {
      this.videoEl.muted = false;
      this.videoEl.volume = 1.0;
      const playPromise = this.videoEl.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.videoEl.pause();
          this.videoEl.currentTime = 0;
          this.videoEl.muted = false;
          this.videoEl.volume = 1.0;
          console.log('✅ [MindAR] Video audio primed cleanly');
        }).catch(err => {
          console.warn('[MindAR] Video prime caught:', err);
        });
      }
    }
  }

  initVideoElement() {
    if (!this.videoEl) {
      this.videoEl = document.getElementById('custom-wedding-video');
    }
    if (this.videoEl) {
      this.videoEl.src = '/videokahwin.mp4';
      this.videoEl.setAttribute('playsinline', '');
      this.videoEl.setAttribute('webkit-playsinline', '');
      this.videoEl.loop = true;
      this.videoEl.preload = 'auto';

      this.videoEl.addEventListener('loadedmetadata', () => {
        this.fitVideoTextureToPlane();
      });
      this.videoEl.addEventListener('playing', () => {
        this.fitVideoTextureToPlane();
      });

      // Connect video to living engine fallback as well
      this.livingEngine.setCustomVideo(this.videoEl);
    }

    if (this.livingPlaneEl) {
      this.livingPlaneEl.addEventListener('materialtextureloaded', () => {
        this.fitVideoTextureToPlane();
      });
      this.livingPlaneEl.addEventListener('loaded', () => {
        this.fitVideoTextureToPlane();
      });
    }
  }

  initTextureCanvases() {
    // Generate and attach 3D floating banners via standard data URLs
    const bannerCanvas = LivingPhotoEngine.createBannerCanvas('SELAMAT PENGANTIN BAHARU');
    const bannerUrl = bannerCanvas.toDataURL('image/png');

    const namesCanvas = LivingPhotoEngine.createNamesCanvas(this.coupleName);
    const namesUrl = namesCanvas.toDataURL('image/png');

    if (this.bannerPlaneEl) {
      this.bannerPlaneEl.setAttribute('material', `src: url(${bannerUrl}); shader: flat; transparent: true; opacity: 0.98;`);
    }

    if (this.namesPlaneEl) {
      this.namesPlaneEl.setAttribute('material', `src: url(${namesUrl}); shader: flat; transparent: true; opacity: 0.98;`);
    }

    // Connect living engine frame update to A-Frame mesh texture
    this.livingEngine.onFrame = () => {
      if (this.livingPlaneEl) {
        const mesh = this.livingPlaneEl.getObject3D('mesh');
        if (mesh && mesh.material && mesh.material.map) {
          mesh.material.map.needsUpdate = true;
        }
      }
    };
  }

  setupListeners() {
    if (!this.targetEl) return;

    this.targetEl.addEventListener('targetFound', () => {
      console.log('✨ [MindAR] Image Target Found! Video & audio auto-playing!');
      this.isTargetFound = true;
      this.livingEngine.start();

      // Start smooth dissolve from still photo into playing video with audio
      this.playWeddingVideo();

      weddingAudio.playMagneticSnap();

      // Romantic Wedding Lights & Starlight Aura
      weddingLights.burst({
        origin: { x: 0.5, y: 0.5 },
        count: 75
      });

      if (this.onStatusChange) {
        this.onStatusChange(true);
      }
    });

    this.targetEl.addEventListener('targetLost', () => {
      console.log('ℹ️ [MindAR] Image Target Lost, silencing audio & hiding video');
      this.isTargetFound = false;

      // Silence audio and hide video immediately
      this.pauseWeddingVideo();

      if (this.onStatusChange) {
        this.onStatusChange(false);
      }
    });

    // Auto-prime video on any user touch/click
    const primeAudio = () => {
      this.primeVideo();
    };
    ['click', 'touchstart', 'touchend', 'pointerdown'].forEach(evt => {
      window.addEventListener(evt, primeAudio, { passive: true });
    });
  }

  primeVideo() {
    if (!this.videoEl) return;
    this.videoEl.muted = false;
    this.videoEl.volume = 1.0;
    if (this.isTargetFound && this.videoEl.paused) {
      this.playWeddingVideo();
    }
  }

  // Continuous WebGL texture refresh loop ensuring video frames are pushed to GPU
  startVideoTextureLoop() {
    if (this.videoTextureAnimId) return;
    const updateLoop = () => {
      if (this.isTargetFound && this.videoEl && !this.videoEl.paused && this.videoEl.readyState >= 2) {
        if (this.livingPlaneEl) {
          const mesh = this.livingPlaneEl.getObject3D('mesh');
          if (mesh && mesh.material && mesh.material.map) {
            mesh.material.map.needsUpdate = true;
          }
        }
      }
      this.videoTextureAnimId = requestAnimationFrame(updateLoop);
    };
    this.videoTextureAnimId = requestAnimationFrame(updateLoop);
  }

  // Master Sound Toggle method (called by header sound button)
  setSoundActive(active) {
    this.isSoundActive = !!active;
    if (this.videoEl) {
      this.videoEl.muted = !this.isSoundActive;
      if (this.isSoundActive) {
        this.videoEl.volume = 1.0;
        weddingAudio.stopMusic();
        if (this.isTargetFound && this.videoEl.paused) {
          this.videoEl.play().catch(e => console.warn('[MindAR] Unmute play:', e));
        }
      }
    }
  }

  // =========================================================================
  // INSTANT VIDEO DISPLAY & HIDE (Immediate playback as soon as target detected)
  // =========================================================================
  showVideoImmediately() {
    if (this.fadeAnimId) {
      cancelAnimationFrame(this.fadeAnimId);
      this.fadeAnimId = null;
    }
    // Hide static photo layer and show video plane
    if (this.stillPlaneEl) this.stillPlaneEl.setAttribute('visible', 'false');
    if (this.shimmerPlaneEl) this.shimmerPlaneEl.setAttribute('visible', 'false');
    if (this.livingPlaneEl) {
      this.livingPlaneEl.setAttribute('visible', 'true');
      const mesh = this.livingPlaneEl.getObject3D('mesh');
      if (mesh && mesh.material) {
        mesh.material.opacity = 1.0;
        mesh.material.transparent = false;
        if (mesh.material.map) {
          mesh.material.map.needsUpdate = true;
        }
        mesh.material.needsUpdate = true;
      }
    }
    if (this.targetEl) this.targetEl.setAttribute('scale', '1 1 1');
  }

  hideVideoImmediately() {
    if (this.fadeAnimId) {
      cancelAnimationFrame(this.fadeAnimId);
      this.fadeAnimId = null;
    }
    // Show static photo layer and hide video plane
    if (this.stillPlaneEl) this.stillPlaneEl.setAttribute('visible', 'true');
    if (this.livingPlaneEl) this.livingPlaneEl.setAttribute('visible', 'false');
    if (this.shimmerPlaneEl) this.shimmerPlaneEl.setAttribute('visible', 'false');
    if (this.targetEl) this.targetEl.setAttribute('scale', '1 1 1');
  }

  fitVideoTextureToPlane() {
    if (!this.livingPlaneEl || !this.videoEl) return;

    const mesh = this.livingPlaneEl.getObject3D('mesh');
    if (!mesh || !mesh.material) return;

    const vWidth = this.videoEl.videoWidth || 1280;
    const vHeight = this.videoEl.videoHeight || 720;
    const vAspect = vWidth / vHeight; // e.g. 1.7777778 for 16:9 video

    // Adjust video texture coordinates so center region fills the square plane without distortion
    const map = mesh.material.map;
    if (map) {
      const pAspect = 1.0; // square target plane
      if (vAspect > pAspect) {
        const repeatX = pAspect / vAspect; // 720 / 1280 = 0.5625
        const repeatY = 1.0;
        const offsetX = (1.0 - repeatX) / 2; // 0.21875
        map.repeat.set(repeatX, repeatY);
        map.offset.set(offsetX, 0.0);
      } else {
        const repeatX = 1.0;
        const repeatY = vAspect / pAspect;
        const offsetY = (1.0 - repeatY) / 2;
        map.repeat.set(repeatX, repeatY);
        map.offset.set(0.0, offsetY);
      }
      map.updateMatrix();
      map.needsUpdate = true;
    }
  }

  async playWeddingVideo() {
    if (!this.videoEl) return;

    // Show video plane immediately on target detection
    this.showVideoImmediately();

    // Ensure video texture is fitted to 1:1 plane
    this.fitVideoTextureToPlane();

    // Ensure video starts cleanly from beginning (0.0s)
    try {
      this.videoEl.currentTime = 0;
    } catch (e) {}

    // Apply user sound preference: default is OFF (muted), or ON if user toggled sound button
    if (this.isSoundActive) {
      this.videoEl.muted = false;
      this.videoEl.volume = 1.0;
      weddingAudio.stopMusic();
    } else {
      this.videoEl.muted = true;
    }

    try {
      await this.videoEl.play();
    } catch (err) {
      console.warn('[WeddingVideo] Play catch:', err);
      try {
        this.videoEl.muted = true;
        await this.videoEl.play();
      } catch (e2) {}
    }

    // Ensure video plane stays active
    this.showVideoImmediately();
  }

  pauseWeddingVideo() {
    if (this.videoEl) {
      if (!this.videoEl.paused) {
        this.videoEl.pause();
      }
      try {
        this.videoEl.currentTime = 0;
      } catch (e) {}
    }
    this.hideVideoImmediately();
  }

  async start() {
    if (!this.sceneEl) return false;
    try {
      this.sceneContainer?.classList.remove('hidden');
      
      // Start living motion engine
      this.livingEngine.start();

      // Start MindAR A-Frame image tracking system
      const mindarSystem = this.sceneEl.systems && this.sceneEl.systems['mindar-image-system'];
      if (mindarSystem) {
        await mindarSystem.start();
      } else {
        // Wait for A-Frame scene to load if still initializing
        this.sceneEl.addEventListener('renderstart', async () => {
          const sys = this.sceneEl.systems['mindar-image-system'];
          if (sys) await sys.start();
        }, { once: true });
      }

      this.isTracking = true;
      return true;
    } catch (err) {
      console.warn('[MindAR] Camera start failed, falling back to simulated motion:', err);
      return false;
    }
  }

  stop() {
    if (this.videoEl) {
      if (!this.videoEl.paused) {
        this.videoEl.pause();
      }
      try {
        this.videoEl.currentTime = 0;
      } catch (e) {}
    }
    this.hideVideoImmediately();
    this.livingEngine.stop();
    if (this.sceneEl && this.sceneEl.systems) {
      const mindarSystem = this.sceneEl.systems['mindar-image-system'];
      if (mindarSystem) {
        mindarSystem.stop();
      }
    }
    this.sceneContainer?.classList.add('hidden');
    this.isTracking = false;
  }

  // Allow user to upload and play their own real wedding video on the photo target!
  setCustomVideo(file) {
    if (!file || !this.videoEl) return;
    const url = URL.createObjectURL(file);
    this.videoEl.src = url;
    this.videoEl.play();
    this.livingEngine.setCustomVideo(this.videoEl);

    if (this.livingPlaneEl) {
      this.livingPlaneEl.setAttribute('material', {
        src: '#custom-wedding-video',
        shader: 'flat'
      });
      setTimeout(() => this.fitVideoTextureToPlane(), 100);
    }
  }
}
