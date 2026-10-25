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
  // SMOOTH DISSOLVE CROSSFADE & EXACT ALIGNMENT (From Still Photo to Living Video)
  // =========================================================================
  smoothDissolveToVideo(duration = 650) {
    if (this.fadeAnimId) {
      cancelAnimationFrame(this.fadeAnimId);
      this.fadeAnimId = null;
    }

    if (!this.livingPlaneEl || !this.stillPlaneEl) return;

    // Both planes remain visible so still photo is seamlessly replaced by video
    this.stillPlaneEl.setAttribute('visible', 'true');
    this.livingPlaneEl.setAttribute('visible', 'true');

    const stillMesh = this.stillPlaneEl.getObject3D('mesh');
    const videoMesh = this.livingPlaneEl.getObject3D('mesh');

    if (stillMesh && stillMesh.material) {
      stillMesh.material.transparent = true;
      stillMesh.material.opacity = 1.0;
      stillMesh.material.depthWrite = false;
      stillMesh.material.needsUpdate = true;
    }

    if (videoMesh && videoMesh.material) {
      videoMesh.material.transparent = true;
      videoMesh.material.opacity = 0.0;
      videoMesh.material.depthWrite = false;
      videoMesh.material.needsUpdate = true;
    }

    const startTime = performance.now();

    const step = (now) => {
      if (!this.isTargetFound) return;

      const progress = Math.min((now - startTime) / duration, 1.0);
      // Smooth sinusoidal / cubic easing
      const ease = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      if (videoMesh && videoMesh.material) {
        videoMesh.material.opacity = ease;
        videoMesh.material.needsUpdate = true;
      }

      if (progress < 1.0) {
        this.fadeAnimId = requestAnimationFrame(step);
      } else {
        this.fadeAnimId = null;
        if (videoMesh && videoMesh.material) {
          videoMesh.material.opacity = 1.0;
          videoMesh.material.needsUpdate = true;
        }
        console.log('✨ [MindAR] Seamless transition from photo to video completed!');
      }
    };

    this.fadeAnimId = requestAnimationFrame(step);
  }

  fitVideoTextureToPlane() {
    if (!this.livingPlaneEl || !this.videoEl) return;

    // Target image (1024x1024) is 1:1 square.
    // In MindAR target space, width is 1.0 and height is 1.0.
    const exactW = '1.0';
    const exactH = '1.0';

    // Set identical dimensions and locked Z positions
    this.livingPlaneEl.setAttribute('width', exactW);
    this.livingPlaneEl.setAttribute('height', exactH);
    this.livingPlaneEl.setAttribute('position', '0 0 0.002');

    if (this.stillPlaneEl) {
      this.stillPlaneEl.setAttribute('width', exactW);
      this.stillPlaneEl.setAttribute('height', exactH);
      this.stillPlaneEl.setAttribute('position', '0 0 0.001');
    }

    if (this.borderPlaneEl) {
      this.borderPlaneEl.setAttribute('visible', 'false');
    }

    // Floating banners float independently with 3D depth above (y = 0.65) and below (y = -0.65) the square photo
    if (this.bannerPlaneEl) {
      this.bannerPlaneEl.setAttribute('position', '0 0.65 0.02');
    }
    if (this.namesPlaneEl) {
      this.namesPlaneEl.setAttribute('position', '0 -0.65 0.02');
    }

    // Map still photo (1024x1024) 100% edge-to-edge
    if (this.stillPlaneEl) {
      const stillMesh = this.stillPlaneEl.getObject3D('mesh');
      if (stillMesh && stillMesh.material && stillMesh.material.map) {
        const map = stillMesh.material.map;
        map.repeat.set(1.0, 1.0);
        map.offset.set(0.0, 0.0);
        map.updateMatrix();
        map.needsUpdate = true;
      }
    }

    // Map video (1280x720) center-cropped horizontally to 1:1 square (720x720)
    // repeatX = 720 / 1280 = 0.5625, offsetX = (1.0 - 0.5625) / 2 = 0.21875
    if (this.livingPlaneEl) {
      const videoMesh = this.livingPlaneEl.getObject3D('mesh');
      if (videoMesh && videoMesh.material && videoMesh.material.map) {
        const map = videoMesh.material.map;
        map.repeat.set(0.5625, 1.0);
        map.offset.set(0.21875, 0.0);
        map.updateMatrix();
        map.needsUpdate = true;
      }
    }
  }

  async playWeddingVideo() {
    if (!this.videoEl) return;

    // Lock exact same size & position
    this.fitVideoTextureToPlane();

    // Reset video to start cleanly
    try {
      this.videoEl.currentTime = 0;
    } catch (e) {}

    // Apply sound preference (default muted, or unmuted if user enabled sound)
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

    // Trigger silky-smooth dissolve once the video is genuinely playing
    if (this.videoEl.readyState >= 2 && !this.videoEl.paused) {
      this.smoothDissolveToVideo(650);
    } else {
      const onReady = () => {
        this.videoEl.removeEventListener('playing', onReady);
        this.videoEl.removeEventListener('timeupdate', onReady);
        if (this.isTargetFound) {
          this.smoothDissolveToVideo(650);
        }
      };
      this.videoEl.addEventListener('playing', onReady, { once: true });
      this.videoEl.addEventListener('timeupdate', onReady, { once: true });
      setTimeout(() => {
        if (this.isTargetFound && !this.fadeAnimId) {
          this.smoothDissolveToVideo(650);
        }
      }, 350);
    }
  }

  pauseWeddingVideo() {
    if (this.fadeAnimId) {
      cancelAnimationFrame(this.fadeAnimId);
      this.fadeAnimId = null;
    }
    if (this.videoEl) {
      if (!this.videoEl.paused) {
        this.videoEl.pause();
      }
      try {
        this.videoEl.currentTime = 0;
      } catch (e) {}
    }

    // Reset video opacity to 0 and ensure still photo is ready at 1.0 opacity
    if (this.livingPlaneEl) {
      const mesh = this.livingPlaneEl.getObject3D('mesh');
      if (mesh && mesh.material) {
        mesh.material.opacity = 0.0;
        mesh.material.needsUpdate = true;
      }
    }
    if (this.stillPlaneEl) {
      this.stillPlaneEl.setAttribute('visible', 'true');
      const mesh = this.stillPlaneEl.getObject3D('mesh');
      if (mesh && mesh.material) {
        mesh.material.opacity = 1.0;
        mesh.material.needsUpdate = true;
      }
    }
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
