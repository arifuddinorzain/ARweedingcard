import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { weddingAudio } from './audio.js';
import confetti from 'canvas-confetti';

// Real-world Device Orientation / Gyroscope Manager for Mobile WebAR
export class DeviceOrientationManager {
  constructor(camera) {
    this.camera = camera;
    this.enabled = false;
    this.deviceOrientation = {};
    this.screenOrientation = 0;
    
    this.initialAlpha = null;
    this.userYawOffset = 0;
    this.hasReceivedOrientation = false;

    this.zee = new THREE.Vector3(0, 0, 1);
    this.euler = new THREE.Euler();
    this.q0 = new THREE.Quaternion();
    this.q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    this.deviceQuaternion = new THREE.Quaternion();
  }

  async requestPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          this.startListening();
          return true;
        }
      } catch (err) {
        console.warn('iOS orientation permission error:', err);
      }
      return false;
    } else if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      this.startListening();
      return true;
    }
    return false;
  }

  startListening() {
    this.enabled = true;
    this.onDeviceOrientation = this.onDeviceOrientation.bind(this);
    this.onScreenOrientation = this.onScreenOrientation.bind(this);

    window.addEventListener('deviceorientation', this.onDeviceOrientation, false);
    window.addEventListener('orientationchange', this.onScreenOrientation, false);
    this.onScreenOrientation();
  }

  stopListening() {
    this.enabled = false;
    window.removeEventListener('deviceorientation', this.onDeviceOrientation);
    window.removeEventListener('orientationchange', this.onScreenOrientation);
  }

  onDeviceOrientation(e) {
    if (e.alpha === null || e.beta === null || e.gamma === null) return;
    this.hasReceivedOrientation = true;
    this.deviceOrientation = {
      alpha: e.alpha,
      beta: e.beta,
      gamma: e.gamma
    };

    if (this.initialAlpha === null) {
      this.initialAlpha = e.alpha;
    }
  }

  onScreenOrientation() {
    this.screenOrientation = window.orientation || (window.screen && window.screen.orientation && window.screen.orientation.angle) || 0;
  }

  resetHeading() {
    if (this.deviceOrientation.alpha !== undefined) {
      this.initialAlpha = this.deviceOrientation.alpha;
    }
    this.userYawOffset = 0;
  }

  update() {
    if (!this.enabled || !this.hasReceivedOrientation) return false;

    const { alpha, beta, gamma } = this.deviceOrientation;
    if (alpha === undefined) return false;

    const relativeAlpha = alpha - (this.initialAlpha || 0);

    const _alpha = THREE.MathUtils.degToRad(relativeAlpha) + this.userYawOffset;
    const _beta = THREE.MathUtils.degToRad(beta);
    const _gamma = THREE.MathUtils.degToRad(gamma);
    const _orient = THREE.MathUtils.degToRad(this.screenOrientation);

    this.euler.set(_beta, _alpha, -_gamma, 'YXZ');
    this.deviceQuaternion.setFromEuler(this.euler);
    this.deviceQuaternion.multiply(this.q1);
    this.deviceQuaternion.multiply(this.q0.setFromAxisAngle(this.zee, -_orient));

    this.camera.quaternion.copy(this.deviceQuaternion);
    return true;
  }
}

export class WeddingARScene {
  constructor(canvasElement, videoElement, mindarContainerElement = null) {
    this.canvas = canvasElement;
    this.video = videoElement;
    this.mindarContainer = mindarContainerElement;
    this.mindarThree = null;
    this.onTargetStatusChange = null;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.gyroManager = null;
    
    // Core 3D Groups
    this.arAnchor = null;
    this.cardMesh = null;
    this.virtualTable = null;
    
    // AR Magnet Photo Components
    this.arMagnetGroup = null;
    this.magnetPhotoMesh = null;
    this.magnetFrameMesh = null;
    this.magnetShadowMesh = null;
    this.magnetWaveMesh = null;
    this.cornerClips = [];
    
    // 3D Floating Elements
    this.topBanner = null;
    this.btmPlaque = null;
    this.orbitingHearts = [];
    this.hologramParticles = null;
    
    // Theme & Shader control
    this.currentTheme = 'gold'; // 'gold', 'cyan', 'ruby'
    this.themeColors = {
      gold: { primary: 0xd4af37, light: 0xfff1cf, glow: 0xffe6a3, hex: '#d4af37' },
      cyan: { primary: 0x00e5ff, light: 0x80d8ff, glow: 0x00b0ff, hex: '#00e5ff' },
      ruby: { primary: 0xd81b60, light: 0xff80ab, glow: 0xff4081, hex: '#d81b60' }
    };

    // Magnet Physics State
    this.isMagnetLocked = false;
    this.magnetElevation = 0.045; // target height when popped out
    this.currentElevation = 0.045;
    this.targetElevation = 0.045;
    this.magnetScale = 1.0;
    this.magnetSpringVelocity = 0;
    this.magnetTiltX = 0;
    this.magnetTiltZ = 0;

    this.clock = new THREE.Clock();
    this.isCameraActive = false;
    this.isAutoSpinning = false;
    this.isAnimationPaused = false;

    // Fallback swipe tracking for desktop
    this.manualYaw = 0;
    this.manualPitch = 0;
    this.isDragging = false;
    this.lastPointer = { x: 0, y: 0 };
    this.pointerNormalized = new THREE.Vector2(0, 0);

    this.coupleName = 'Arif & Haziqah';
    this.weddingDate = '24 Disember 2026';

    this.initScene();
  }

  initScene() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera: Angled view for natural looking down at table card
    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    this.camera.position.set(0, 0.78, 1.25);
    this.camera.lookAt(0, 0.22, 0);

    // 3. Renderer with transparent background for WebAR
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // 4. OrbitControls (for Virtual 3D simulation)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.35;
    this.controls.maxDistance = 3.5;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 0.22, 0);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.2;

    // 5. Gyroscope Orientation Manager
    this.gyroManager = new DeviceOrientationManager(this.camera);

    // 6. Lighting
    this.setupLighting();

    // 7. AR Anchor Group
    this.arAnchor = new THREE.Group();
    this.arAnchor.position.set(0, 0, 0);
    this.scene.add(this.arAnchor);

    // 8. Build 3D Models
    this.buildVirtualBanquetTable();
    this.buildPhysicalWeddingCard();
    this.buildARMagnetPhoto(); // The Living AR Magnet Centerpiece!
    this.buildFloating3DGreetings();
    this.buildOrbitingHearts();
    this.buildHologramParticles();

    // 9. Event Listeners & Interactions
    window.addEventListener('resize', () => this.onWindowResize());
    this.setupGestures();

    // 10. Start Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xfff5ea, 1.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainLight.position.set(1.5, 3.5, 2.0);
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xffd700, 1.4);
    rimLight.position.set(-2, 2.0, -1.5);
    this.scene.add(rimLight);

    // Magnetic beacon point light
    this.magnetPointLight = new THREE.PointLight(0xd4af37, 2.5, 2.5, 1.2);
    this.magnetPointLight.position.set(0, 0.2, -0.065);
    this.scene.add(this.magnetPointLight);
  }

  // Virtual Banquet Table with Dark Royal Silk Tablecloth & Ambience
  buildVirtualBanquetTable() {
    this.virtualTable = new THREE.Group();

    // Table Top Surface
    const tableGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.04, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0d211a,
      roughness: 0.7,
      metalness: 0.1
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -0.02;
    this.virtualTable.add(tableMesh);

    // Gold Embroidered Table Runner Mat
    const runnerGeo = new THREE.PlaneGeometry(0.7, 1.1);
    const runnerMat = new THREE.MeshStandardMaterial({
      color: 0x143428,
      roughness: 0.5,
      metalness: 0.2
    });
    const runnerMesh = new THREE.Mesh(runnerGeo, runnerMat);
    runnerMesh.rotation.x = -Math.PI / 2;
    runnerMesh.position.y = 0.001;
    this.virtualTable.add(runnerMesh);

    // Soft Table Shadow under card
    const shadowGeo = new THREE.PlaneGeometry(0.65, 0.85);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.0025;
    this.virtualTable.add(shadowMesh);

    this.scene.add(this.virtualTable);
  }

  // The Physical Wedding Card Lying on the Table
  buildPhysicalWeddingCard() {
    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = 700;
    cardCanvas.height = 950;
    const ctx = cardCanvas.getContext('2d');

    const drawCardTexture = (img = null) => {
      // Parchment Background
      const grad = ctx.createLinearGradient(0, 0, 700, 950);
      grad.addColorStop(0, '#fdfaf5');
      grad.addColorStop(1, '#f3ebd9');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 700, 950);

      // Gold Double Border
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, 660, 910);
      ctx.strokeStyle = 'rgba(170, 130, 10, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, 636, 886);

      // Header Text
      ctx.fillStyle = '#6b1d28';
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px serif';
      ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 350, 65);

      ctx.fillStyle = '#aa820a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('WALIMATULURUS', 350, 95);

      ctx.fillStyle = '#4a0e17';
      ctx.font = 'bold 36px serif';
      ctx.fillText(this.coupleName, 350, 140);

      // Base printed photo placeholder on card (1:1 square matching pengantin.jpg)
      const photoSize = 400;
      const photoX = (700 - photoSize) / 2;
      const photoY = 160;
      const photoW = photoSize;
      const photoH = photoSize;

      if (img && img.complete) {
        ctx.drawImage(img, photoX, photoY, photoW, photoH);
      } else {
        ctx.fillStyle = '#4a0e17';
        ctx.fillRect(photoX, photoY, photoW, photoH);
      }

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 5;
      ctx.strokeRect(photoX, photoY, photoW, photoH);

      // AR Target Marker Tag
      ctx.fillStyle = 'rgba(74, 14, 23, 0.9)';
      ctx.fillRect(photoX + 50, photoY + photoH - 32, 300, 28);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(photoX + 50, photoY + photoH - 32, 300, 28);
      ctx.fillStyle = '#f3e5ab';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🧲 FOTO SASARAN AR MAGNET 🧲', 350, photoY + photoH - 13);

      // Instructions & Details
      ctx.fillStyle = '#aa820a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('▼ IMBAS QR & HALAKAN KAMERA KE FOTO DI ATAS ▼', 350, 565);

      // QR visual on 3D card
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(270, 585, 160, 160);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 3;
      ctx.strokeRect(270, 585, 160, 160);

      ctx.fillStyle = '#1a0c0e';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('📱 QR WEBAR', 350, 670);

      // Card Footer
      ctx.fillStyle = '#4a0e17';
      ctx.font = 'italic 14px serif';
      ctx.fillText('Foto Pengantin Akan Hidup & Terapung Sebagai AR Magnet!', 350, 775);

      ctx.fillStyle = '#aa820a';
      ctx.font = 'bold 16px serif';
      ctx.fillText(`${this.weddingDate}  •  Dewan Perdana Felda`, 350, 815);

      if (this.cardTexture) this.cardTexture.needsUpdate = true;
    };

    drawCardTexture();

    const imgLoader = new Image();
    imgLoader.crossOrigin = 'anonymous';
    imgLoader.src = '/pengantin.jpg';
    imgLoader.onload = () => {
      drawCardTexture(imgLoader);
    };

    this.cardTexture = new THREE.CanvasTexture(cardCanvas);
    this.cardTexture.anisotropy = 4;

    const cardGeo = new THREE.BoxGeometry(0.42, 0.003, 0.57);
    const cardMat = new THREE.MeshStandardMaterial({
      map: this.cardTexture,
      roughness: 0.35,
      metalness: 0.1
    });

    this.cardMesh = new THREE.Mesh(cardGeo, cardMat);
    this.cardMesh.position.set(0, 0.003, 0);
    this.arAnchor.add(this.cardMesh);
  }

  // =========================================================================
  // AR MAGNET LIVING PHOTO CENTERPIECE
  // Sits precisely on top of the card's photo rectangle & comes alive with animations!
  // =========================================================================
  buildARMagnetPhoto() {
    this.arMagnetGroup = new THREE.Group();
    // Centered exactly over the 1:1 photo on the card:
    this.arMagnetGroup.position.set(0, 0.045, -0.069);

    const magnetW = 0.24;
    const magnetH = 0.24;

    // 1. Dynamic Magnetic Soft Contact Shadow on Card Surface below
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d');
    const sgrad = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    sgrad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    sgrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
    sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(magnetW * 1.25, magnetH * 1.35);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    this.magnetShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.magnetShadowMesh.rotation.x = -Math.PI / 2;
    this.magnetShadowMesh.position.set(0, -0.04, 0);
    this.arMagnetGroup.add(this.magnetShadowMesh);

    // 2. Load Couple Photo & Wedding Video Texture
    const textureLoader = new THREE.TextureLoader();
    this.photoTexture = textureLoader.load('/pengantin.jpg');
    this.photoTexture.anisotropy = 4;

    this.weddingVideoEl = document.createElement('video');
    this.weddingVideoEl.src = '/videokahwin.mp4';
    this.weddingVideoEl.crossOrigin = 'anonymous';
    this.weddingVideoEl.loop = true;
    this.weddingVideoEl.muted = true;
    this.weddingVideoEl.playsInline = true;
    this.weddingVideoEl.setAttribute('webkit-playsinline', '');
    this.weddingVideoEl.preload = 'auto';

    this.videoTexture = new THREE.VideoTexture(this.weddingVideoEl);
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;
    this.isVideoPlayingIn3D = false;

    // 3. Living Photo Shader:
    // - Diagonal golden sunbeam sweep across mosque & couple
    // - Twinkling star glints on the couple's songket embroidery
    // - Magnetic perimeter energy glow
    // - 3D parallax depth shift with camera tilt
    // - Smooth crossfade dissolve into videokahwin.mp4
    this.magnetShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.photoTexture },
        uVideoTexture: { value: this.videoTexture },
        uBlendProgress: { value: 0.0 },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xd4af37) },
        uParallaxOffset: { value: new THREE.Vector2(0, 0) },
        uMagneticIntensity: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uVideoTexture;
        uniform float uBlendProgress;
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec2 uParallaxOffset;
        uniform float uMagneticIntensity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          // Cinematic Breathing & Motion ("Gambar Bergerak"):
          // Slow cinematic zoom loop (in & out breathing motion)
          float zoom = 1.0 + sin(uTime * 0.75) * 0.045;
          vec2 centeredUv = (vUv - 0.5) / zoom + 0.5;
          
          // Subtle gentle sway / drift
          vec2 cinematicDrift = vec2(sin(uTime * 0.45) * 0.012, cos(uTime * 0.55) * 0.008);

          // Dynamic 3D Parallax shift from viewer perspective
          vec3 viewDir = normalize(vViewPosition);
          vec2 shiftedUv = centeredUv + cinematicDrift + uParallaxOffset * 0.03 + viewDir.xy * 0.015;
          shiftedUv = clamp(shiftedUv, 0.002, 0.998);

          vec4 photoColor = texture2D(uTexture, shiftedUv);
          // Center-crop video to fit 1:1 square without squashing 16:9 ratio
          vec2 videoUv = vec2((vUv.x - 0.5) * (720.0 / 1280.0) + 0.5, vUv.y);
          vec4 videoColor = texture2D(uVideoTexture, videoUv);
          vec4 texColor = mix(photoColor, videoColor, uBlendProgress);

          // 1. Diagonal Sunbeam / Light Sweep across the mosque & couple
          // Sweeps every 3.5 seconds diagonally
          float sweepProgress = mod(uTime * 0.42, 1.8) - 0.4;
          float sweepCoord = (vUv.x * 0.7 + (1.0 - vUv.y) * 0.3);
          float sweepBand = smoothstep(0.0, 0.14, 0.14 - abs(sweepCoord - sweepProgress));
          vec3 sunbeam = vec3(1.0, 0.94, 0.78) * sweepBand * 0.55;

          // 2. Songket Sparkle Glints (twinkling star diamonds on songket fabric)
          // Songket area: lower middle region of photo
          float songketMask = smoothstep(0.05, 0.25, 1.0 - vUv.y) * (1.0 - smoothstep(0.65, 0.85, 1.0 - vUv.y));
          float sparkle1 = sin(vUv.x * 140.0 + uTime * 6.0) * sin(vUv.y * 140.0 - uTime * 4.0);
          float sparkle2 = sin(vUv.x * 100.0 - uTime * 5.0) * sin(vUv.y * 100.0 + uTime * 7.0);
          float sparkleVal = max(0.0, pow(sparkle1 * sparkle2, 10.0)) * songketMask * 3.5;
          vec3 sparkleColor = vec3(1.0, 0.98, 0.85) * sparkleVal;

          // 3. Magnetic Edge Energy Glow
          float borderX = min(vUv.x, 1.0 - vUv.x);
          float borderY = min(vUv.y, 1.0 - vUv.y);
          float borderDist = min(borderX, borderY);
          float borderGlow = smoothstep(0.035, 0.001, borderDist) * (0.7 + sin(uTime * 4.0) * 0.3);
          vec3 magneticRim = uColor * borderGlow * uMagneticIntensity;

          // 4. Subtle Specular Sheen on tilt
          float sheen = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.5) * 0.35;

          vec3 finalColor = texColor.rgb + sunbeam + sparkleColor + magneticRim + (uColor * sheen);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide
    });

    // 4. The 3D Magnetic Plaque (Thick physical badge with rounded corners)
    // Lies flat/horizontal over the card photo: X=width, Z=height, Y=thickness
    const plaqueGeo = new THREE.BoxGeometry(magnetW, 0.008, magnetH);
    
    // Materials: top surface has living photo shader, sides/back have shiny gold metal
    const goldFrameMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.92,
      roughness: 0.15
    });

    const plaqueMaterials = [
      goldFrameMat, // right
      goldFrameMat, // left
      this.magnetShaderMat, // top face (the photo!)
      goldFrameMat, // bottom
      goldFrameMat, // front
      goldFrameMat  // back
    ];

    this.magnetPhotoMesh = new THREE.Mesh(plaqueGeo, plaqueMaterials);
    this.magnetPhotoMesh.castShadow = true;
    this.arMagnetGroup.add(this.magnetPhotoMesh);

    // 5. 4 Corner Magnetic Brackets / Clips on the Photo
    const clipGeo = new THREE.BoxGeometry(0.024, 0.012, 0.024);
    const clipCorners = [
      [-magnetW / 2 + 0.01, -magnetH / 2 + 0.01],
      [magnetW / 2 - 0.01, -magnetH / 2 + 0.01],
      [-magnetW / 2 + 0.01, magnetH / 2 - 0.01],
      [magnetW / 2 - 0.01, magnetH / 2 - 0.01]
    ];
    clipCorners.forEach(([cx, cz]) => {
      const clip = new THREE.Mesh(clipGeo, goldFrameMat);
      clip.position.set(cx, 0.002, cz);
      this.cornerClips.push(clip);
      this.arMagnetGroup.add(clip);
    });

    // 6. Expanding Magnetic Field Wave Ring (radiates out periodically)
    const waveGeo = new THREE.RingGeometry(magnetW * 0.45, magnetW * 0.47, 48);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    this.magnetWaveMesh = new THREE.Mesh(waveGeo, waveMat);
    this.magnetWaveMesh.rotation.x = -Math.PI / 2;
    this.magnetWaveMesh.position.y = 0.006;
    this.arMagnetGroup.add(this.magnetWaveMesh);

    this.arAnchor.add(this.arMagnetGroup);
  }

  // Floating 3D Typography & Greetings: "✨ SELAMAT PENGANTIN BAHARU ✨"
  buildFloating3DGreetings() {
    // 1. Top Arched Banner Floating Above the Magnetic Photo
    const topCanvas = document.createElement('canvas');
    topCanvas.width = 800;
    topCanvas.height = 200;
    const tCtx = topCanvas.getContext('2d');

    // Royal Burgundy Pill Backing
    tCtx.fillStyle = 'rgba(74, 14, 23, 0.92)';
    tCtx.beginPath();
    tCtx.roundRect(40, 20, 720, 160, 40);
    tCtx.fill();

    tCtx.strokeStyle = '#d4af37';
    tCtx.lineWidth = 6;
    tCtx.beginPath();
    tCtx.roundRect(40, 20, 720, 160, 40);
    tCtx.stroke();

    // Arabic Blessing
    tCtx.fillStyle = '#f3e5ab';
    tCtx.textAlign = 'center';
    tCtx.font = 'bold 30px "Playfair Display", serif';
    tCtx.fillText('بَارَكَ اللَّهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا', 400, 70);

    // Main Greeting
    tCtx.fillStyle = '#ffffff';
    tCtx.font = 'bold 44px "Cinzel", "Playfair Display", serif';
    tCtx.fillText('SELAMAT PENGANTIN BAHARU', 400, 135);

    const topTex = new THREE.CanvasTexture(topCanvas);
    const topGeo = new THREE.PlaneGeometry(0.34, 0.085);
    const topMat = new THREE.MeshBasicMaterial({
      map: topTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.topBanner = new THREE.Mesh(topGeo, topMat);
    // Floating angled right above the top edge of the photo
    this.topBanner.position.set(0, 0.09, -0.22);
    this.topBanner.rotation.x = -Math.PI / 6;
    this.arAnchor.add(this.topBanner);

    // 2. Bottom Floating Name Plaque: "Arif & Haziqah"
    const btmCanvas = document.createElement('canvas');
    btmCanvas.width = 700;
    btmCanvas.height = 180;
    const bCtx = btmCanvas.getContext('2d');

    bCtx.fillStyle = 'rgba(10, 25, 20, 0.92)';
    bCtx.beginPath();
    bCtx.roundRect(30, 15, 640, 150, 35);
    bCtx.fill();

    bCtx.strokeStyle = '#d4af37';
    bCtx.lineWidth = 5;
    bCtx.beginPath();
    bCtx.roundRect(30, 15, 640, 150, 35);
    bCtx.stroke();

    bCtx.fillStyle = '#f3e5ab';
    bCtx.textAlign = 'center';
    bCtx.font = 'bold 46px "Playfair Display", serif';
    bCtx.fillText(this.coupleName, 350, 78);

    bCtx.fillStyle = '#d4af37';
    bCtx.font = '22px "Plus Jakarta Sans", sans-serif';
    bCtx.fillText(`🧲 ${this.weddingDate} • Kasih Abadi 🧲`, 350, 125);

    const btmTex = new THREE.CanvasTexture(btmCanvas);
    const btmGeo = new THREE.PlaneGeometry(0.32, 0.082);
    const btmMat = new THREE.MeshBasicMaterial({
      map: btmTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.btmPlaque = new THREE.Mesh(btmGeo, btmMat);
    // Floating angled right below the bottom edge of the photo
    this.btmPlaque.position.set(0, 0.08, 0.085);
    this.btmPlaque.rotation.x = -Math.PI / 8;
    this.arAnchor.add(this.btmPlaque);
  }

  // 3D Golden Hearts Orbiting the AR Magnet Photo
  buildOrbitingHearts() {
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0);
    heartShape.bezierCurveTo(0, -0.01, -0.02, -0.03, -0.04, -0.03);
    heartShape.bezierCurveTo(-0.065, -0.03, -0.065, 0, -0.065, 0);
    heartShape.bezierCurveTo(-0.065, 0.025, -0.04, 0.05, 0, 0.08);
    heartShape.bezierCurveTo(0.04, 0.05, 0.065, 0.025, 0.065, 0);
    heartShape.bezierCurveTo(0.065, 0, 0.065, -0.03, 0.04, -0.03);
    heartShape.bezierCurveTo(0.02, -0.03, 0, -0.01, 0, 0);

    const extrudeSettings = { depth: 0.008, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.004, bevelThickness: 0.004 };
    const heartGeo = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);

    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xaa820a,
      emissiveIntensity: 0.3
    });

    for (let i = 0; i < 4; i++) {
      const heartMesh = new THREE.Mesh(heartGeo, heartMat);
      heartMesh.scale.set(0.22, 0.22, 0.22);
      heartMesh.rotation.z = Math.PI;

      const heartData = {
        mesh: heartMesh,
        speed: 0.7 + i * 0.2,
        radiusX: 0.22 + (i % 2) * 0.05,
        radiusZ: 0.16 + (i % 2) * 0.04,
        phase: (i * Math.PI) / 2,
        baseY: 0.06 + (i * 0.02)
      };

      this.orbitingHearts.push(heartData);
      this.arAnchor.add(heartMesh);
    }
  }

  // 150+ Rising Golden Stardust Particles from Magnet into the Air
  buildHologramParticles() {
    const count = 160;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.36;
      positions[i * 3 + 1] = Math.random() * 0.4;
      positions[i * 3 + 2] = -0.065 + (Math.random() - 0.5) * 0.25;
      speeds[i] = 0.06 + Math.random() * 0.14;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d');
    const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    pGrad.addColorStop(0.3, 'rgba(243, 229, 171, 0.9)');
    pGrad.addColorStop(0.7, 'rgba(212, 175, 55, 0.3)');
    pGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    pCtx.fillStyle = pGrad;
    pCtx.fillRect(0, 0, 64, 64);

    const pTexture = new THREE.CanvasTexture(pCanvas);

    const material = new THREE.PointsMaterial({
      size: 0.022,
      map: pTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xd4af37
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSpeeds = speeds;
    this.particlePhases = phases;
    this.arAnchor.add(this.particleSystem);
  }

  toggle3DWeddingVideo() {
    if (!this.weddingVideoEl) return;
    if (this.fadeAnimId3D) {
      cancelAnimationFrame(this.fadeAnimId3D);
      this.fadeAnimId3D = null;
    }

    if (this.isVideoPlayingIn3D) {
      // Fade back to still photo smoothly
      const startProg = this.magnetShaderMat ? this.magnetShaderMat.uniforms.uBlendProgress.value : 1.0;
      const startTime = performance.now();
      const dur = 800;

      const fadeOut = (now) => {
        const p = Math.min((now - startTime) / dur, 1.0);
        if (this.magnetShaderMat) {
          this.magnetShaderMat.uniforms.uBlendProgress.value = startProg * (1.0 - p);
        }
        if (p < 1.0) {
          this.fadeAnimId3D = requestAnimationFrame(fadeOut);
        } else {
          this.weddingVideoEl.pause();
          this.isVideoPlayingIn3D = false;
          this.fadeAnimId3D = null;
        }
      };
      this.fadeAnimId3D = requestAnimationFrame(fadeOut);
    } else {
      weddingAudio.stopMusic();
      this.weddingVideoEl.currentTime = 0;
      this.weddingVideoEl.muted = false;
      this.weddingVideoEl.play().catch(() => {
        this.weddingVideoEl.muted = true;
        this.weddingVideoEl.play();
      });
      this.isVideoPlayingIn3D = true;

      // Smooth cinematic dissolve from photo (0.0) to video (1.0)
      const startTime = performance.now();
      const dur = 1300; // 1.3s smooth dissolve

      const fadeIn = (now) => {
        const p = Math.min((now - startTime) / dur, 1.0);
        const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        if (this.magnetShaderMat) {
          this.magnetShaderMat.uniforms.uBlendProgress.value = ease;
        }
        if (p < 1.0) {
          this.fadeAnimId3D = requestAnimationFrame(fadeIn);
        } else {
          this.fadeAnimId3D = null;
        }
      };
      this.fadeAnimId3D = requestAnimationFrame(fadeIn);
    }
  }

  // =========================================================================
  // AR MAGNET INTERACTION & SPRING SNAP PHYSICS
  // =========================================================================
  triggerMagneticSnap() {
    this.isMagnetLocked = true;
    weddingAudio.playMagneticSnap();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([25, 40, 25]);
    }

    // Toggle 3D wedding video playback on the photo
    this.toggle3DWeddingVideo();

    // Magnetic Spring Pop Animation:
    // Plaque snaps up with energetic spring bounce!
    this.magnetScale = 1.14;
    this.currentElevation = 0.085;
    this.magnetSpringVelocity = 0.05;

    // Pulse magnetic wave
    if (this.magnetWaveMesh) {
      this.magnetWaveMesh.scale.set(0.6, 0.6, 0.6);
      this.magnetWaveMesh.material.opacity = 1.0;
    }

    // Confetti celebration
    confetti({
      particleCount: 65,
      spread: 75,
      origin: { y: 0.65 },
      colors: ['#d4af37', '#f3e5ab', '#b71c1c', '#ffffff', '#ffd700']
    });
  }

  // Backwards compatible method
  triggerHologramBurst() {
    this.triggerMagneticSnap();
  }

  // Set Hologram / Magnet Color Theme: 'gold', 'cyan', 'ruby'
  setTheme(themeName) {
    if (!this.themeColors[themeName]) return;
    this.currentTheme = themeName;
    const t = this.themeColors[themeName];

    if (this.magnetShaderMat) {
      this.magnetShaderMat.uniforms.uColor.value.setHex(t.primary);
    }
    if (this.magnetWaveMesh && this.magnetWaveMesh.material) {
      this.magnetWaveMesh.material.color.setHex(t.primary);
    }
    if (this.magnetPointLight) {
      this.magnetPointLight.color.setHex(t.primary);
    }
    if (this.particleSystem && this.particleSystem.material) {
      this.particleSystem.material.color.setHex(t.primary);
    }

    this.triggerMagneticSnap();
  }

  toggleAutoRotate() {
    this.isAutoSpinning = !this.isAutoSpinning;
    if (this.controls) {
      this.controls.autoRotate = this.isAutoSpinning;
    }
    return this.isAutoSpinning;
  }

  recenterAnchor() {
    this.gyroManager.resetHeading();
    this.manualYaw = 0;
    this.manualPitch = 0;
    if (this.controls) {
      this.controls.reset();
      this.camera.position.set(0, 0.78, 1.25);
      this.camera.lookAt(0, 0.22, 0);
    }
    weddingAudio.playThemeSwitch();
  }

  setCameraARMode(active) {
    this.isCameraActive = active;
    if (active) {
      // 1. Remove green background & banquet table (buang background hijau dan meja)
      if (this.virtualTable) this.virtualTable.visible = false;

      // 2. Remove physical 3D paper card & shadow (buang kad fizikal 3D di skrin kamera)
      if (this.cardMesh) this.cardMesh.visible = false;
      if (this.magnetShadowMesh) this.magnetShadowMesh.visible = false;

      // 3. Set transparent WebGL clear color so real camera feed shows through 100%
      if (this.renderer) {
        this.renderer.setClearColor(0x000000, 0);
      }

      // 4. Orient the living moving photo upright and facing camera
      if (this.arAnchor) {
        this.arAnchor.position.set(0, 0, 0);
        this.arAnchor.rotation.set(0, 0, 0);
      }
      if (this.arMagnetGroup) {
        this.arMagnetGroup.position.set(0, 0, 0);
        this.arMagnetGroup.rotation.set(Math.PI / 2, 0, 0);
      }
      if (this.topBanner) {
        this.topBanner.position.set(0, 0.22, 0.01);
        this.topBanner.rotation.set(0, 0, 0);
      }
      if (this.btmPlaque) {
        this.btmPlaque.position.set(0, -0.22, 0.01);
        this.btmPlaque.rotation.set(0, 0, 0);
      }

      this.camera.position.set(0, 0, 1.05);
      this.camera.lookAt(0, 0, 0);

      if (this.controls) this.controls.enabled = false;
      this.gyroManager.startListening();
    } else {
      // Restore tabletop 3D simulation
      if (this.virtualTable) this.virtualTable.visible = true;
      if (this.cardMesh) this.cardMesh.visible = true;
      if (this.magnetShadowMesh) this.magnetShadowMesh.visible = true;

      if (this.arAnchor) {
        this.arAnchor.position.set(0, 0, 0);
        this.arAnchor.rotation.set(0, 0, 0);
      }
      if (this.arMagnetGroup) {
        this.arMagnetGroup.position.set(0, 0.045, -0.065);
        this.arMagnetGroup.rotation.set(0, 0, 0);
      }
      if (this.topBanner) {
        this.topBanner.position.set(0, 0.09, -0.22);
        this.topBanner.rotation.set(-Math.PI / 6, 0, 0);
      }
      if (this.btmPlaque) {
        this.btmPlaque.position.set(0, 0.08, 0.085);
        this.btmPlaque.rotation.set(-Math.PI / 8, 0, 0);
      }

      this.camera.position.set(0, 0.78, 1.25);
      this.camera.lookAt(0, 0.22, 0);

      if (this.controls) this.controls.enabled = true;
      this.gyroManager.stopListening();
    }
  }

  async startCamera() {
    try {
      if (!this.video) {
        this.video = document.getElementById('ar-video-feed');
      }
      if (this.video) {
        this.video.classList.remove('hidden');
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('webkit-playsinline', '');
        this.video.muted = true;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported on this origin');
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
      }

      if (this.video) {
        this.video.srcObject = stream;
        await this.video.play();
      }
      
      this.setCameraARMode(true);
      return true;
    } catch (err) {
      console.warn('Camera access denied or unavailable, keeping virtual table mode.', err);
      this.setCameraARMode(false);
      return false;
    }
  }

  stopCamera() {
    if (this.video && this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
      this.video.classList.add('hidden');
    }
    this.setCameraARMode(false);
  }

  captureSnapshot(coupleName = "Arif & Haziqah", tableInfo = "Meja 07 • Kasih Abadi") {
    const snapshotCanvas = document.createElement('canvas');
    const width = this.canvas.width;
    const height = this.canvas.height;
    snapshotCanvas.width = width;
    snapshotCanvas.height = height;
    const ctx = snapshotCanvas.getContext('2d');

    if (this.isCameraActive && this.video.readyState >= 2) {
      const vWidth = this.video.videoWidth;
      const vHeight = this.video.videoHeight;
      const vAspect = vWidth / vHeight;
      const cAspect = width / height;

      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (vAspect > cAspect) {
        drawWidth = height * vAspect;
        offsetX = -(drawWidth - width) / 2;
      } else {
        drawHeight = width / vAspect;
        offsetY = -(drawHeight - height) / 2;
      }
      ctx.drawImage(this.video, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0a1612');
      grad.addColorStop(0.5, '#12251e');
      grad.addColorStop(1, '#08100d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(this.canvas, 0, 0);

    // Royal Gold Photo Frame
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = Math.max(width * 0.008, 4);
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = 'rgba(243, 229, 171, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    const bannerHeight = 90;
    const bannerY = height - 35 - bannerHeight;
    ctx.fillStyle = 'rgba(10, 20, 16, 0.88)';
    ctx.fillRect(30, bannerY, width - 60, bannerHeight);

    ctx.fillStyle = '#d4af37';
    ctx.fillRect(30, bannerY, width - 60, 2.5);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f3e5ab';
    ctx.font = `bold ${Math.max(Math.floor(width * 0.038), 22)}px 'Playfair Display', serif`;
    ctx.fillText(`Walimatulurus ${coupleName}`, width / 2, bannerY + 40);

    ctx.fillStyle = '#d4af37';
    ctx.font = `${Math.max(Math.floor(width * 0.024), 14)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText(`🧲 ${tableInfo} • Kenangan AR Magnet 🧲`, width / 2, bannerY + 68);

    return snapshotCanvas.toDataURL('image/png');
  }

  setupGestures() {
    let pointerStartX = 0;
    let pointerStartY = 0;

    const onPointerDown = (e) => {
      this.isDragging = true;
      pointerStartX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      pointerStartY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      this.lastPointer = { x: pointerStartX, y: pointerStartY };

      // Tap on AR Magnet to trigger magnetic pop & sound!
      this.triggerMagneticSnap();
    };

    const onPointerMove = (e) => {
      const curX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const curY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      // Update normalized pointer (-1 to +1) for parallax
      this.pointerNormalized.x = (curX / window.innerWidth) * 2 - 1;
      this.pointerNormalized.y = -(curY / window.innerHeight) * 2 + 1;

      if (!this.isDragging || !this.isCameraActive) return;

      const deltaX = (curX - this.lastPointer.x) * 0.005;
      const deltaY = (curY - this.lastPointer.y) * 0.005;

      this.gyroManager.userYawOffset -= deltaX;
      this.manualPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.manualPitch - deltaY));

      this.lastPointer = { x: curX, y: curY };
    };

    const onPointerUp = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(this.animate);

    if (this.isAnimationPaused) {
      if (this.controls) this.controls.update();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Camera & Orientation
    if (this.isCameraActive) {
      if (this.isAutoSpinning) {
        this.gyroManager.userYawOffset += delta * 0.6;
      }
      const hasGyro = this.gyroManager.update();
      if (!hasGyro) {
        const euler = new THREE.Euler(this.manualPitch, this.gyroManager.userYawOffset, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
      }
    } else {
      if (this.controls) {
        this.controls.update();
      }
    }

    // 2. AR Magnet Spring Physics (Bounce & Hover Levitation)
    // Spring physics towards target elevation (0.045m)
    const springK = 28.0;
    const damping = 4.5;
    const force = (this.targetElevation - this.currentElevation) * springK;
    this.magnetSpringVelocity += (force - this.magnetSpringVelocity * damping) * delta;
    this.currentElevation += this.magnetSpringVelocity * delta;

    // Scale spring back to 1.0
    this.magnetScale += (1.0 - this.magnetScale) * 0.12;

    // Dynamic gentle levitation hover wave
    const levitationWave = Math.sin(time * 2.5) * 0.003;
    const finalY = this.currentElevation + levitationWave;

    if (this.arMagnetGroup) {
      this.arMagnetGroup.position.y = finalY;
      this.arMagnetGroup.scale.set(this.magnetScale, this.magnetScale, this.magnetScale);

      // Tilt parallax: tilts slightly based on pointer position / viewing angle
      const targetTiltX = this.pointerNormalized.y * 0.15;
      const targetTiltZ = -this.pointerNormalized.x * 0.15;
      this.arMagnetGroup.rotation.x += (targetTiltX - this.arMagnetGroup.rotation.x) * 0.08;
      this.arMagnetGroup.rotation.z += (targetTiltZ - this.arMagnetGroup.rotation.z) * 0.08;

      // Update drop shadow scale & opacity based on elevation
      if (this.magnetShadowMesh) {
        const shadowDist = finalY / 0.045;
        this.magnetShadowMesh.scale.set(1.0 + shadowDist * 0.15, 1.0 + shadowDist * 0.15, 1.0);
        this.magnetShadowMesh.material.opacity = Math.max(0.2, 0.75 - shadowDist * 0.25);
      }
    }

    // 3. Update Living Photo Shader Uniforms
    if (this.magnetShaderMat) {
      this.magnetShaderMat.uniforms.uTime.value = time;
      this.magnetShaderMat.uniforms.uParallaxOffset.value.set(
        this.pointerNormalized.x * 0.5,
        this.pointerNormalized.y * 0.5
      );
    }

    // 4. Expanding Magnetic Field Wave
    if (this.magnetWaveMesh) {
      this.magnetWaveMesh.scale.x += delta * 0.8;
      this.magnetWaveMesh.scale.y += delta * 0.8;
      this.magnetWaveMesh.material.opacity -= delta * 0.6;
      if (this.magnetWaveMesh.material.opacity <= 0) {
        this.magnetWaveMesh.scale.set(0.7, 0.7, 0.7);
        this.magnetWaveMesh.material.opacity = 0.65;
      }
    }

    // 5. Orbiting Hearts
    this.orbitingHearts.forEach(h => {
      const angle = time * h.speed + h.phase;
      const x = Math.sin(angle) * h.radiusX;
      const z = -0.065 + Math.cos(angle) * h.radiusZ;
      const y = h.baseY + Math.sin(time * 2.5 + h.phase) * 0.015;

      h.mesh.position.set(x, y, z);
      h.mesh.rotation.y = angle + Math.PI / 2;
    });

    // 6. Stardust Particles Rising From Magnet
    if (this.particleSystem) {
      const pos = this.particleSystem.geometry.attributes.position.array;
      const count = pos.length / 3;

      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += this.particleSpeeds[i] * delta;
        pos[i * 3] += Math.sin(time * 1.5 + this.particlePhases[i]) * 0.0008;

        if (pos[i * 3 + 1] > 0.45) {
          pos[i * 3 + 1] = 0.04;
          pos[i * 3] = (Math.random() - 0.5) * 0.36;
          pos[i * 3 + 2] = -0.065 + (Math.random() - 0.5) * 0.25;
        }
      }
      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 7. Beacon point light flicker
    if (this.magnetPointLight) {
      this.magnetPointLight.intensity = 2.2 + Math.sin(time * 5) * 0.3;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
