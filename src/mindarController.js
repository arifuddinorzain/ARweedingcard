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

      // Connect video to living engine fallback as well
      this.livingEngine.setCustomVideo(this.videoEl);
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
      console.log('✨ [MindAR] Image Target Found! Playing videokahwin.mp4 on couple photo!');
      this.isTargetFound = true;
      this.livingEngine.start();

      // Automatically play videokahwin.mp4 right on the photo!
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

      // Pause video when user turns camera away
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

    // Window tap/click unmutes video if browser initially started it muted
    window.addEventListener('click', () => {
      if (this.videoEl && !this.videoEl.paused && this.videoEl.muted) {
        this.videoEl.muted = false;
        this.updateAudioBadgeState(true);
      }
    }, { passive: true });
  }

  async playWeddingVideo() {
    if (!this.videoEl) return;

    // Attach video directly as material src for high-performance GPU video plane
    if (this.livingPlaneEl) {
      this.livingPlaneEl.setAttribute('material', {
        src: '#custom-wedding-video',
        shader: 'flat'
      });
    }

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

    if (this.audioBadgeEl) {
      this.audioBadgeEl.classList.remove('hidden');
    }
  }

  pauseWeddingVideo() {
    if (this.videoEl && !this.videoEl.paused) {
      this.videoEl.pause();
    }
    if (this.audioBadgeEl) {
      this.audioBadgeEl.classList.add('hidden');
    }
  }

  toggleVideoAudio() {
    if (!this.videoEl) return;
    this.videoEl.muted = !this.videoEl.muted;
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
    }
  }
}
