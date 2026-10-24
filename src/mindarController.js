import confetti from 'canvas-confetti';
import { weddingAudio } from './audio.js';
import { LivingPhotoEngine } from './livingPhotoEngine.js';

/**
 * MindARController
 * Powers real computer vision Image Target WebAR tracking like Stories AR!
 * Tracks target photo (/card.mind) and brings the image to life as moving video.
 */
export class MindARController {
  constructor(coupleName = 'Arif & Haziqah') {
    this.coupleName = coupleName;
    this.sceneContainer = document.getElementById('mindar-scene-container');
    this.sceneEl = document.getElementById('mindar-scene');
    this.targetEl = document.getElementById('mindar-target');
    this.livingPlaneEl = document.getElementById('ar-living-plane');
    this.bannerPlaneEl = document.getElementById('ar-floating-banner');
    this.namesPlaneEl = document.getElementById('ar-floating-names');
    this.videoEl = document.getElementById('custom-wedding-video');
    
    // Video audio control elements
    this.audioBadgeEl = document.getElementById('video-audio-badge');
    this.soundToggleBtn = document.getElementById('btn-video-audio-toggle');
    this.soundIconEl = document.getElementById('video-sound-icon');
    this.soundTextEl = document.getElementById('video-sound-text');

    // Video aspect fit toggle elements
    this.fitToggleBtn = document.getElementById('btn-video-fit-toggle');
    this.fitIconEl = document.getElementById('video-fit-icon');
    this.fitTextEl = document.getElementById('video-fit-text');

    this.stillPlaneEl = document.getElementById('ar-still-photo-plane');
    this.shimmerPlaneEl = document.getElementById('ar-shimmer-plane');
    this.borderPlaneEl = document.getElementById('ar-gold-border');
    this.fadeAnimId = null;

    // Fit mode: 'cover' (matches image target size 100%) or 'widescreen' (original 16:9 ratio)
    this.fitMode = 'cover';
    this.targetAspect = 1.0; // 1024x1024 pengantin.jpg

    this.livingEngine = new LivingPhotoEngine('living-photo-canvas');
    this.isTracking = false;
    this.isTargetFound = false;
    this.onStatusChange = null;

    this.initVideoElement();
    this.initTextureCanvases();
    this.setupListeners();
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
      console.log('✨ [MindAR] Image Target Found! Smooth cinematic transition from photo to video starting!');
      this.isTargetFound = true;
      this.livingEngine.start();

      // Start smooth dissolve from still photo into playing video
      this.playWeddingVideo();

      weddingAudio.playMagneticSnap();

      // Royal Gold & Celebration Confetti
      confetti({
        particleCount: 85,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#ff8a00', '#d4af37', '#ffffff', '#e11d48']
      });

      if (this.onStatusChange) {
        this.onStatusChange(true);
      }
    });

    this.targetEl.addEventListener('targetLost', () => {
      console.log('ℹ️ [MindAR] Image Target Lost, pausing video');
      this.isTargetFound = false;

      // Pause video and reset transition
      this.pauseWeddingVideo();

      if (this.onStatusChange) {
        this.onStatusChange(false);
      }
    });

    // Sound toggle button click
    this.soundToggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleVideoAudio();
    });

    // Video fit mode toggle button click (Fit to Photo Frame vs Full 16:9)
    this.fitToggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleVideoFitMode();
    });

    // Window tap/click unmutes video if browser initially started it muted
    window.addEventListener('click', () => {
      if (this.videoEl && !this.videoEl.paused && this.videoEl.muted) {
        this.videoEl.muted = false;
        this.updateAudioBadgeState(true);
      }
    }, { passive: true });
  }

  // =========================================================================
  // CINEMATIC SMOOTH TRANSITION: Still Photo ➔ Playing Wedding Video
  // Dissolves seamlessly with breathing scale & golden shimmer light sweep
  // =========================================================================
  startSmoothTransition() {
    if (this.fadeAnimId) {
      cancelAnimationFrame(this.fadeAnimId);
      this.fadeAnimId = null;
    }

    const duration = 1400; // 1.4 seconds smooth cinematic dissolve
    const startTime = performance.now();

    // Start video audio at 0 for smooth volume fade-in
    if (this.videoEl) {
      this.videoEl.volume = 0;
    }

    const animateDissolve = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Smooth easeInOutCubic curve
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // 1. Fade Video Plane IN (0 -> 1)
      if (this.livingPlaneEl) {
        this.livingPlaneEl.setAttribute('material', 'opacity', ease.toFixed(3));
      }

      // 2. Fade Still Photo Layer OUT (1 -> 0)
      if (this.stillPlaneEl) {
        this.stillPlaneEl.setAttribute('material', 'opacity', (1.0 - ease).toFixed(3));
      }

      // 3. Audio volume smooth fade-in (0 -> 1)
      if (this.videoEl && !this.videoEl.muted) {
        this.videoEl.volume = Math.min(ease, 1.0);
      }

      // 4. Golden Shimmer Light Glow: peaks at ~35% of transition, then gently fades
      if (this.shimmerPlaneEl) {
        const shimmerPeak = Math.sin(progress * Math.PI);
        const shimmerOpacity = Math.pow(shimmerPeak, 2) * 0.42;
        this.shimmerPlaneEl.setAttribute('material', 'opacity', shimmerOpacity.toFixed(3));
      }

      // 5. Subtle "picture coming to life" gentle breathing scale
      if (this.targetEl) {
        const breathScale = 1.0 + Math.sin(progress * Math.PI) * 0.035;
        this.targetEl.setAttribute('scale', `${breathScale.toFixed(3)} ${breathScale.toFixed(3)} ${breathScale.toFixed(3)}`);
      }

      if (progress < 1.0) {
        this.fadeAnimId = requestAnimationFrame(animateDissolve);
      } else {
        // Final State: pure video playing at 100%
        if (this.stillPlaneEl) this.stillPlaneEl.setAttribute('material', 'opacity', '0');
        if (this.livingPlaneEl) this.livingPlaneEl.setAttribute('material', 'opacity', '1');
        if (this.shimmerPlaneEl) this.shimmerPlaneEl.setAttribute('material', 'opacity', '0');
        if (this.targetEl) this.targetEl.setAttribute('scale', '1 1 1');
        if (this.videoEl) this.videoEl.volume = 1.0;
        this.fadeAnimId = null;
      }
    };

    this.fadeAnimId = requestAnimationFrame(animateDissolve);
  }

  resetSmoothTransition() {
    if (this.fadeAnimId) {
      cancelAnimationFrame(this.fadeAnimId);
      this.fadeAnimId = null;
    }
    // Instantly reset so next scan starts cleanly from the still photo
    if (this.stillPlaneEl) this.stillPlaneEl.setAttribute('material', 'opacity', '1.0');
    if (this.livingPlaneEl) this.livingPlaneEl.setAttribute('material', 'opacity', '0.0');
    if (this.shimmerPlaneEl) this.shimmerPlaneEl.setAttribute('material', 'opacity', '0.0');
    if (this.targetEl) this.targetEl.setAttribute('scale', '1 1 1');
    if (this.videoEl) this.videoEl.volume = 0.0;
  }

  fitVideoTextureToPlane() {
    if (!this.livingPlaneEl || !this.videoEl) return;

    const mesh = this.livingPlaneEl.getObject3D('mesh');
    if (!mesh || !mesh.material) return;

    const vWidth = this.videoEl.videoWidth || 1280;
    const vHeight = this.videoEl.videoHeight || 720;
    const vAspect = vWidth / vHeight; // e.g. 1.7777778 for 16:9 video

    if (this.fitMode === 'cover') {
      // 1. Plane matches target image size (1.0 x 1.0 square) 100%
      this.livingPlaneEl.setAttribute('width', '1.0');
      this.livingPlaneEl.setAttribute('height', '1.0');

      if (this.stillPlaneEl) {
        this.stillPlaneEl.setAttribute('width', '1.0');
        this.stillPlaneEl.setAttribute('height', '1.0');
      }
      if (this.shimmerPlaneEl) {
        this.shimmerPlaneEl.setAttribute('width', '1.0');
        this.shimmerPlaneEl.setAttribute('height', '1.0');
      }
      if (this.borderPlaneEl) {
        this.borderPlaneEl.setAttribute('width', '1.03');
        this.borderPlaneEl.setAttribute('height', '1.03');
      }
      if (this.bannerPlaneEl) {
        this.bannerPlaneEl.setAttribute('position', '0 0.62 0.05');
      }
      if (this.namesPlaneEl) {
        this.namesPlaneEl.setAttribute('position', '0 -0.62 0.05');
      }

      // 2. Adjust video texture coordinates so center region fills the square plane without distortion
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
        map.matrixAutoUpdate = true;
        map.needsUpdate = true;
      }
    } else {
      // Widescreen 16:9 mode (full original video frame shown)
      const planeH = (1.0 / vAspect).toFixed(3); // e.g. 0.563
      this.livingPlaneEl.setAttribute('width', '1.0');
      this.livingPlaneEl.setAttribute('height', planeH);

      if (this.borderPlaneEl) {
        this.borderPlaneEl.setAttribute('width', '1.03');
        this.borderPlaneEl.setAttribute('height', (parseFloat(planeH) + 0.03).toFixed(3));
      }
      if (this.bannerPlaneEl) {
        this.bannerPlaneEl.setAttribute('position', `0 ${(parseFloat(planeH) / 2 + 0.12).toFixed(3)} 0.05`);
      }
      if (this.namesPlaneEl) {
        this.namesPlaneEl.setAttribute('position', `0 ${(-parseFloat(planeH) / 2 - 0.12).toFixed(3)} 0.05`);
      }

      const map = mesh.material.map;
      if (map) {
        map.repeat.set(1.0, 1.0);
        map.offset.set(0.0, 0.0);
        map.matrixAutoUpdate = true;
        map.needsUpdate = true;
      }
    }
  }

  toggleVideoFitMode() {
    this.fitMode = this.fitMode === 'cover' ? 'widescreen' : 'cover';
    this.fitVideoTextureToPlane();
    this.updateFitBadgeState();
  }

  updateFitBadgeState() {
    if (this.fitIconEl && this.fitTextEl) {
      if (this.fitMode === 'cover') {
        this.fitIconEl.textContent = '📐';
        this.fitTextEl.textContent = 'Padan Saiz Foto (1:1)';
      } else {
        this.fitIconEl.textContent = '📺';
        this.fitTextEl.textContent = 'Nisbah Penuh (16:9)';
      }
    }
  }

  async playWeddingVideo() {
    if (!this.videoEl) return;

    // Ensure video texture is fitted to plane
    this.fitVideoTextureToPlane();

    // Reset video to start cleanly
    this.videoEl.currentTime = 0;

    // Stop synthesized background music so wedding video audio can play clearly
    weddingAudio.stopMusic();

    try {
      // First attempt to play with audio (succeeds if user gesture primed it)
      this.videoEl.muted = false;
      await this.videoEl.play();
      this.updateAudioBadgeState(true);
    } catch (err) {
      console.warn('[WeddingVideo] Autoplay with sound blocked by mobile browser. Playing muted:', err);
      try {
        this.videoEl.muted = true;
        await this.videoEl.play();
        this.updateAudioBadgeState(false);
      } catch (e2) {
        console.error('[WeddingVideo] Failed to play video:', e2);
      }
    }

    // Launch smooth 1.4s cinematic dissolve from photo to video
    this.startSmoothTransition();

    if (this.audioBadgeEl) {
      this.audioBadgeEl.classList.remove('hidden');
    }
  }

  pauseWeddingVideo() {
    if (this.videoEl && !this.videoEl.paused) {
      this.videoEl.pause();
    }
    this.resetSmoothTransition();
    if (this.audioBadgeEl) {
      this.audioBadgeEl.classList.add('hidden');
    }
  }

  toggleVideoAudio() {
    if (!this.videoEl) return;
    this.videoEl.muted = !this.videoEl.muted;
    if (!this.videoEl.muted) {
      this.videoEl.volume = 1.0;
    }
    this.updateAudioBadgeState(!this.videoEl.muted);
  }

  updateAudioBadgeState(isAudioActive) {
    if (this.soundIconEl && this.soundTextEl) {
      if (isAudioActive) {
        this.soundIconEl.textContent = '🔊';
        this.soundTextEl.textContent = 'Suara Video Aktif';
      } else {
        this.soundIconEl.textContent = '🔇';
        this.soundTextEl.textContent = 'Ketik Untuk Dengar Suara Video';
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
    this.pauseWeddingVideo();
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
