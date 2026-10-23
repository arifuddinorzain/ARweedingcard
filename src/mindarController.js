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

    this.livingEngine = new LivingPhotoEngine('living-photo-canvas');
    this.isTracking = false;
    this.isTargetFound = false;
    this.onStatusChange = null;

    this.initTextureCanvases();
    this.setupListeners();
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
      console.log('✨ [MindAR] Image Target Found! Photo Coming Alive!');
      this.isTargetFound = true;
      this.livingEngine.start();
      weddingAudio.playMagneticSnap();

      // Confetti celebration
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ff8a00', '#d4af37', '#ffffff', '#e11d48']
      });

      // Voice greeting
      weddingAudio.speakGreeting(this.coupleName);

      if (this.onStatusChange) {
        this.onStatusChange(true);
      }
    });

    this.targetEl.addEventListener('targetLost', () => {
      console.log('ℹ️ [MindAR] Image Target Lost');
      this.isTargetFound = false;

      if (this.onStatusChange) {
        this.onStatusChange(false);
      }
    });
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
