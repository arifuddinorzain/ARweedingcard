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
  constructor(canvasElement, videoElement) {
    this.canvas = canvasElement;
    this.video = videoElement;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.gyroManager = null;
    
    // Core 3D Groups
    this.arAnchor = null;
    this.cardMesh = null;
    this.hologramGroup = null;
    this.portalEmitter = null;
    this.lightBeam = null;
    this.couplePlaque = null;
    this.greetingBanners = [];
    this.orbitingHearts = [];
    this.hologramParticles = null;
    this.virtualTable = null;
    this.scanReticle = null;
    
    // Theme & Shader control
    this.currentTheme = 'gold'; // 'gold', 'cyan', 'ruby'
    this.themeColors = {
      gold: { primary: 0xd4af37, light: 0xfff1cf, glow: 0xffe6a3, hex: '#d4af37' },
      cyan: { primary: 0x00e5ff, light: 0x80d8ff, glow: 0x00b0ff, hex: '#00e5ff' },
      ruby: { primary: 0xd81b60, light: 0xff80ab, glow: 0xff4081, hex: '#d81b60' }
    };

    this.clock = new THREE.Clock();
    this.isCameraActive = false;
    this.isAutoSpinning = false;
    this.hasTargetLocked = true; // Auto-locks onto card

    // Fallback swipe tracking for desktop / non-gyro devices
    this.manualYaw = 0;
    this.manualPitch = 0;
    this.isDragging = false;
    this.lastPointer = { x: 0, y: 0 };

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
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    this.camera.position.set(0, 0.85, 1.45);
    this.camera.lookAt(0, 0.35, 0);

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
    this.controls.minDistance = 0.45;
    this.controls.maxDistance = 4.0;
    this.controls.maxPolarAngle = Math.PI / 2.02;
    this.controls.target.set(0, 0.35, 0);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.2;

    // 5. Gyroscope Orientation Manager (Active in Camera AR mode)
    this.gyroManager = new DeviceOrientationManager(this.camera);

    // 6. Lighting
    this.setupLighting();

    // 7. AR Anchor Group (anchors onto the card on table)
    this.arAnchor = new THREE.Group();
    this.arAnchor.position.set(0, 0, 0);
    this.scene.add(this.arAnchor);

    // 8. Build 3D Models
    this.buildVirtualBanquetTable();
    this.buildPhysicalWeddingCard();
    this.buildHologramPortalEmitter();
    this.buildHologramCouple();
    this.buildFloating3DGreetings();
    this.buildOrbitingHearts();
    this.buildHologramParticles();

    // 9. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.setupGestures();

    // 10. Start Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 1.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(1.5, 3.5, 2.0);
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xffd700, 1.2);
    rimLight.position.set(-2, 2.0, -1.5);
    this.scene.add(rimLight);

    // Hologram vertical projection beacon
    this.holoPointLight = new THREE.PointLight(0xd4af37, 2.5, 3.0, 1.2);
    this.holoPointLight.position.set(0, 0.4, 0);
    this.scene.add(this.holoPointLight);
  }

  // Virtual Banquet Table with Dark Royal Silk Tablecloth & Ambience
  buildVirtualBanquetTable() {
    this.virtualTable = new THREE.Group();

    // 1. Table Top Surface
    const tableGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.04, 48);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x0d211a, // Royal dark emerald cloth
      roughness: 0.7,
      metalness: 0.1
    });
    const tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.y = -0.02;
    this.virtualTable.add(tableMesh);

    // 2. Gold Embroidered Table Runner Mat
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

    // Gold trim on runner
    const borderGeo = new THREE.RingGeometry(0.38, 0.39, 48);
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.rotation.x = -Math.PI / 2;
    borderMesh.position.y = 0.002;
    this.virtualTable.add(borderMesh);

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

  // The Physical Wedding Card Lying on the Table (Card Marker)
  buildPhysicalWeddingCard() {
    // Generate Wedding Card Texture with the Couple Photo & QR
    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = 700;
    cardCanvas.height = 950;
    const ctx = cardCanvas.getContext('2d');

    // Draw initial card
    const drawCardTexture = (img = null) => {
      // Background Parchment
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

      // Couple Photo
      const photoX = 85;
      const photoY = 165;
      const photoW = 530;
      const photoH = 370;

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
      ctx.fillRect(photoX + 115, photoY + photoH - 32, 300, 28);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(photoX + 115, photoY + photoH - 32, 300, 28);
      ctx.fillStyle = '#f3e5ab';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('🎯 SASARAN KAMERA AR HOLOGRAM 🎯', 350, photoY + photoH - 13);

      // Instructions & Details
      ctx.fillStyle = '#aa820a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('▼ IMBAS KOD QR & HALAKAN KAMERA KE FOTO DI ATAS ▼', 350, 565);

      // Mock QR visual on 3D card
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
      ctx.fillText('Saksikan Hologram 3D Pasangan Pengantin Muncul Membawa Ucapan!', 350, 775);

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

    // Card 3D Geometry (0.42m width x 0.57m length x 0.003m thickness)
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

  // Hologram Base Portal Emitter on the Card Photo
  buildHologramPortalEmitter() {
    this.portalEmitter = new THREE.Group();
    // Centered above the couple photo area on the card
    this.portalEmitter.position.set(0, 0.006, -0.065);

    // 1. Outer Concentric Cyber-Gold Geometric Ring
    const outerRingGeo = new THREE.RingGeometry(0.18, 0.195, 64);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    this.outerRing.rotation.x = -Math.PI / 2;
    this.portalEmitter.add(this.outerRing);

    // 2. Middle Runes Ring
    const midRingGeo = new THREE.RingGeometry(0.13, 0.145, 48);
    const midRingMat = new THREE.MeshBasicMaterial({
      color: 0xffe6a3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65
    });
    this.midRing = new THREE.Mesh(midRingGeo, midRingMat);
    this.midRing.rotation.x = -Math.PI / 2;
    this.portalEmitter.add(this.midRing);

    // 3. Inner Glowing Core Disc
    const coreGeo = new THREE.CircleGeometry(0.09, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });
    this.coreDisc = new THREE.Mesh(coreGeo, coreMat);
    this.coreDisc.rotation.x = -Math.PI / 2;
    this.portalEmitter.add(this.coreDisc);

    // 4. Vertical Hologram Volumetric Light Cone
    // Beams up from the card surface directly into the floating hologram!
    const coneGeo = new THREE.CylinderGeometry(0.24, 0.14, 0.55, 32, 1, true);
    
    // Shader for vertical gradient fading out upwards
    const beamMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xd4af37) },
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          // Vertical fade
          float alpha = (1.0 - vUv.y) * 0.45;
          // Scanlines
          float scan = sin(vUv.y * 30.0 - uTime * 4.0) * 0.1 + 0.9;
          gl_FragColor = vec4(uColor * scan, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.lightBeam = new THREE.Mesh(coneGeo, beamMat);
    this.lightBeam.position.set(0, 0.27, 0);
    this.portalEmitter.add(this.lightBeam);

    // 5. Four Corner Holographic Projector Nodes
    const nodeGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.015, 16);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    });
    const corners = [
      [-0.17, -0.12],
      [0.17, -0.12],
      [-0.17, 0.12],
      [0.17, 0.12]
    ];
    corners.forEach(([x, z]) => {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(x, 0.007, z);
      this.portalEmitter.add(node);
    });

    this.arAnchor.add(this.portalEmitter);
  }

  // The 3D Floating Couple Hologram (The Centerpiece of the Experience!)
  buildHologramCouple() {
    this.hologramGroup = new THREE.Group();
    // Floats right above the photo projection base
    this.hologramGroup.position.set(0, 0.38, -0.065);

    // 1. Load Couple Photo Texture
    const textureLoader = new THREE.TextureLoader();
    this.photoTexture = textureLoader.load('/pengantin.jpg');
    this.photoTexture.anisotropy = 4;

    // 2. Holographic Arch Display Shader Material
    // Features moving scanlines, color tint, edge fresnel glow, and shimmer!
    this.holoShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: this.photoTexture },
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xd4af37) },
        uGlowIntensity: { value: 1.0 },
        uHoloMix: { value: 0.45 }
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
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uGlowIntensity;
        uniform float uHoloMix;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          // Sample couple image
          vec4 texColor = texture2D(uTexture, vUv);

          // Moving horizontal holographic scanlines
          float scanline = sin(vUv.y * 70.0 - uTime * 3.5) * 0.12 + 0.88;

          // Hologram shimmer flicker
          float flicker = sin(uTime * 8.0) * 0.03 + 0.97;

          // Fresnel rim glow
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.2) * 1.4;

          // Mix photo with royal hologram glow
          vec3 holoTint = mix(texColor.rgb, uColor * (texColor.r * 0.8 + 0.3), uHoloMix);
          vec3 finalColor = (holoTint * scanline * flicker) + (uColor * fresnel * uGlowIntensity);

          // Ethereal slight transparency
          gl_FragColor = vec4(finalColor, 0.96);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    // 3. Arched Plaque Geometry (Proportions 0.32m width x 0.42m height)
    // Custom arched top shape
    const archShape = new THREE.Shape();
    const w = 0.16;
    const h = 0.18;
    const r = 0.16; // Arch radius at top
    archShape.moveTo(-w, -h);
    archShape.lineTo(w, -h);
    archShape.lineTo(w, h * 0.5);
    archShape.absarc(0, h * 0.5, r, 0, Math.PI, false);
    archShape.lineTo(-w, -h);

    const archGeo = new THREE.ShapeGeometry(archShape, 32);
    
    // Fix UVs so photo fits perfectly into the arched shape
    const pos = archGeo.attributes.position;
    const uvs = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const u = (x + w) / (w * 2);
      const v = (y + h) / (h * 1.5 + r);
      uvs.push(u, v);
    }
    archGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    this.couplePlaque = new THREE.Mesh(archGeo, this.holoShaderMat);
    this.hologramGroup.add(this.couplePlaque);

    // 4. Royal Golden Arched Frame & Filigree Border
    const frameEdges = new THREE.EdgesGeometry(archGeo);
    const frameMat = new THREE.LineBasicMaterial({
      color: 0xffe6a3,
      linewidth: 3,
      transparent: true,
      opacity: 0.9
    });
    this.frameMesh = new THREE.LineSegments(frameEdges, frameMat);
    this.frameMesh.scale.set(1.01, 1.01, 1.01);
    this.hologramGroup.add(this.frameMesh);

    // 5. Crown Crest atop the Arch
    const crownGeo = new THREE.ConeGeometry(0.02, 0.035, 4);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2
    });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.set(0, h * 0.5 + r + 0.018, 0);
    crown.rotation.y = Math.PI / 4;
    this.hologramGroup.add(crown);

    // 6. Soft Backing Glow Plane (Ethereal Heavenly Aura)
    const auraGeo = new THREE.PlaneGeometry(0.48, 0.58);
    const auraCanvas = document.createElement('canvas');
    auraCanvas.width = 128;
    auraCanvas.height = 128;
    const actx = auraCanvas.getContext('2d');
    const agrad = actx.createRadialGradient(64, 64, 0, 64, 64, 64);
    agrad.addColorStop(0, 'rgba(212, 175, 55, 0.6)');
    agrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.2)');
    agrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
    actx.fillStyle = agrad;
    actx.fillRect(0, 0, 128, 128);

    const auraTex = new THREE.CanvasTexture(auraCanvas);
    const auraMat = new THREE.MeshBasicMaterial({
      map: auraTex,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.auraMesh = new THREE.Mesh(auraGeo, auraMat);
    this.auraMesh.position.set(0, 0.05, -0.005);
    this.hologramGroup.add(this.auraMesh);

    this.arAnchor.add(this.hologramGroup);
  }

  // Floating 3D Typography & Greetings: "Selamat Pengantin Baharu!"
  buildFloating3DGreetings() {
    // 1. Top Curved Banner: "✨ SELAMAT PENGANTIN BAHARU ✨"
    const topCanvas = document.createElement('canvas');
    topCanvas.width = 800;
    topCanvas.height = 200;
    const tCtx = topCanvas.getContext('2d');

    // Royal Glass Pill Backing
    tCtx.fillStyle = 'rgba(74, 14, 23, 0.88)';
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
    const topGeo = new THREE.PlaneGeometry(0.38, 0.095);
    const topMat = new THREE.MeshBasicMaterial({
      map: topTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.topBanner = new THREE.Mesh(topGeo, topMat);
    this.topBanner.position.set(0, 0.28, 0.03);
    this.hologramGroup.add(this.topBanner);

    // 2. Bottom Floating Name Plaque: "Arif & Haziqah"
    const btmCanvas = document.createElement('canvas');
    btmCanvas.width = 700;
    btmCanvas.height = 180;
    const bCtx = btmCanvas.getContext('2d');

    bCtx.fillStyle = 'rgba(10, 25, 20, 0.9)';
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
    bCtx.fillText(`✨ ${this.weddingDate} • Kasih Abadi ✨`, 350, 125);

    const btmTex = new THREE.CanvasTexture(btmCanvas);
    const btmGeo = new THREE.PlaneGeometry(0.34, 0.088);
    const btmMat = new THREE.MeshBasicMaterial({
      map: btmTex,
      transparent: true,
      side: THREE.DoubleSide
    });
    this.btmPlaque = new THREE.Mesh(btmGeo, btmMat);
    this.btmPlaque.position.set(0, -0.22, 0.03);
    this.hologramGroup.add(this.btmPlaque);
  }

  // 3D Golden Hearts Orbiting the Hologram Couple
  buildOrbitingHearts() {
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, 0);
    heartShape.bezierCurveTo(0, -0.01, -0.02, -0.03, -0.04, -0.03);
    heartShape.bezierCurveTo(-0.065, -0.03, -0.065, 0, -0.065, 0);
    heartShape.bezierCurveTo(-0.065, 0.025, -0.04, 0.05, 0, 0.08);
    heartShape.bezierCurveTo(0.04, 0.05, 0.065, 0.025, 0.065, 0);
    heartShape.bezierCurveTo(0.065, 0, 0.065, -0.03, 0.04, -0.03);
    heartShape.bezierCurveTo(0.02, -0.03, 0, -0.01, 0, 0);

    const extrudeSettings = { depth: 0.01, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.005, bevelThickness: 0.005 };
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
      heartMesh.scale.set(0.25, 0.25, 0.25);
      heartMesh.rotation.z = Math.PI; // right side up

      const heartData = {
        mesh: heartMesh,
        speed: 0.6 + i * 0.25,
        radiusX: 0.24 + (i % 2) * 0.06,
        radiusZ: 0.18 + (i % 2) * 0.05,
        phase: (i * Math.PI) / 2,
        baseY: -0.05 + (i * 0.08)
      };

      this.orbitingHearts.push(heartData);
      this.hologramGroup.add(heartMesh);
    }
  }

  // 150+ Rising Golden Stardust Particles from Card to Hologram
  buildHologramParticles() {
    const count = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.32;
      positions[i * 3 + 1] = Math.random() * 0.6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.24;
      speeds[i] = 0.08 + Math.random() * 0.18;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle Canvas Texture (Glow Dot)
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
      size: 0.024,
      map: pTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xd4af37
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.position.set(0, 0, -0.065);
    this.particleSpeeds = speeds;
    this.particlePhases = phases;
    this.arAnchor.add(this.particleSystem);
  }

  // Set Hologram Color Theme: 'gold' (Royal Gold), 'cyan' (Sci-Fi Cyber), 'ruby' (Royal Songket)
  setTheme(themeName) {
    if (!this.themeColors[themeName]) return;
    this.currentTheme = themeName;
    const t = this.themeColors[themeName];

    // Update Hologram Shader
    if (this.holoShaderMat) {
      this.holoShaderMat.uniforms.uColor.value.setHex(t.primary);
    }
    // Update Light Beam
    if (this.lightBeam && this.lightBeam.material) {
      this.lightBeam.material.uniforms.uColor.value.setHex(t.primary);
    }
    // Update Portal Rings
    if (this.outerRing && this.outerRing.material) {
      this.outerRing.material.color.setHex(t.primary);
    }
    if (this.holoPointLight) {
      this.holoPointLight.color.setHex(t.primary);
    }
    if (this.particleSystem && this.particleSystem.material) {
      this.particleSystem.material.color.setHex(t.primary);
    }

    weddingAudio.playThemeSwitch();
  }

  // Trigger Celebration Burst (Confetti, Activation SFX, Voice Greeting)
  triggerHologramBurst() {
    weddingAudio.playHologramActivate();
    weddingAudio.speakGreeting(this.coupleName);

    // Confetti shower
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#d4af37', '#f3e5ab', '#b71c1c', '#ffffff', '#ffd700']
    });

    // Pulse hologram scale
    if (this.hologramGroup) {
      this.hologramGroup.scale.set(1.08, 1.08, 1.08);
      setTimeout(() => {
        if (this.hologramGroup) this.hologramGroup.scale.set(1.0, 1.0, 1.0);
      }, 350);
    }
  }

  // Toggle 360 Auto-Rotation
  toggleAutoRotate() {
    this.isAutoSpinning = !this.isAutoSpinning;
    if (this.controls) {
      this.controls.autoRotate = this.isAutoSpinning;
    }
    return this.isAutoSpinning;
  }

  // Recenter Anchor in front of user
  recenterAnchor() {
    this.gyroManager.resetHeading();
    this.manualYaw = 0;
    this.manualPitch = 0;
    if (this.controls) {
      this.controls.reset();
      this.camera.position.set(0, 0.85, 1.45);
      this.camera.lookAt(0, 0.35, 0);
    }
    weddingAudio.playThemeSwitch();
  }

  // Switch between Camera AR Mode (Transparent overlay on camera) & Virtual 3D Table
  setCameraARMode(active) {
    this.isCameraActive = active;
    if (active) {
      this.virtualTable.visible = false;
      this.camera.position.set(0, 0.65, 1.15);
      this.camera.lookAt(0, 0.3, 0);
      if (this.controls) this.controls.enabled = false;
      this.gyroManager.startListening();
    } else {
      this.virtualTable.visible = true;
      if (this.controls) this.controls.enabled = true;
      this.gyroManager.stopListening();
    }
  }

  // Start Real Mobile/Desktop Camera Feed for WebAR
  async startCamera() {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported on this origin');
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      await this.video.play();
      
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
    }
    this.setCameraARMode(false);
  }

  // Snapshot Capture with High-Res Royal Watermark Frame
  captureSnapshot(coupleName = "Arif & Haziqah", tableInfo = "Meja 07 • Kasih Abadi") {
    const snapshotCanvas = document.createElement('canvas');
    const width = this.canvas.width;
    const height = this.canvas.height;
    snapshotCanvas.width = width;
    snapshotCanvas.height = height;
    const ctx = snapshotCanvas.getContext('2d');

    // 1. Draw camera video feed if active
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

    // 2. Overlay 3D WebGL Canvas
    ctx.drawImage(this.canvas, 0, 0);

    // 3. Royal Gold Photo Frame
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = Math.max(width * 0.008, 4);
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = 'rgba(243, 229, 171, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    // 4. Bottom Watermark Plaque
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
    ctx.fillText(`✨ ${tableInfo} • Kenangan Hologram AR ✨`, width / 2, bannerY + 68);

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
    };

    const onPointerMove = (e) => {
      if (!this.isDragging || !this.isCameraActive) return;
      const curX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const curY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

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

    // 2. Floating Levitation for Hologram Group
    if (this.hologramGroup) {
      this.hologramGroup.position.y = 0.38 + Math.sin(time * 2.0) * 0.012;
      this.hologramGroup.rotation.y = Math.sin(time * 0.8) * 0.04;
    }

    // 3. Update Hologram Shaders (Time uniform for scanlines)
    if (this.holoShaderMat) {
      this.holoShaderMat.uniforms.uTime.value = time;
    }
    if (this.lightBeam && this.lightBeam.material) {
      this.lightBeam.material.uniforms.uTime.value = time;
    }

    // 4. Rotate Portal Emitter Rings
    if (this.outerRing) {
      this.outerRing.rotation.z = time * 0.35;
    }
    if (this.midRing) {
      this.midRing.rotation.z = -time * 0.5;
    }
    if (this.coreDisc) {
      const pulse = 1.0 + Math.sin(time * 3.5) * 0.12;
      this.coreDisc.scale.set(pulse, pulse, pulse);
    }

    // 5. Orbiting Hearts
    this.orbitingHearts.forEach(h => {
      const angle = time * h.speed + h.phase;
      const x = Math.sin(angle) * h.radiusX;
      const z = Math.cos(angle) * h.radiusZ;
      const y = h.baseY + Math.sin(time * 2.5 + h.phase) * 0.02;

      h.mesh.position.set(x, y, z);
      h.mesh.rotation.y = angle + Math.PI / 2;
    });

    // 6. Ascending Stardust Particles
    if (this.particleSystem) {
      const pos = this.particleSystem.geometry.attributes.position.array;
      const count = pos.length / 3;

      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += this.particleSpeeds[i] * delta;
        pos[i * 3] += Math.sin(time * 1.5 + this.particlePhases[i]) * 0.001;

        if (pos[i * 3 + 1] > 0.65) {
          pos[i * 3 + 1] = 0.02;
          pos[i * 3] = (Math.random() - 0.5) * 0.32;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 0.24;
        }
      }
      this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // 7. Beacon point light flicker
    if (this.holoPointLight) {
      this.holoPointLight.intensity = 2.4 + Math.sin(time * 6) * 0.35;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
