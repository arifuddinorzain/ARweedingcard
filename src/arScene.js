import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { weddingAudio } from './audio.js';

// Real-world Device Orientation / Gyroscope Manager
export class DeviceOrientationManager {
  constructor(camera) {
    this.camera = camera;
    this.enabled = false;
    this.deviceOrientation = {};
    this.screenOrientation = 0;
    
    // Heading calibration
    this.initialAlpha = null;
    this.userYawOffset = 0;
    this.hasReceivedOrientation = false;

    // Quaternion math helpers
    this.zee = new THREE.Vector3(0, 0, 1);
    this.euler = new THREE.Euler();
    this.q0 = new THREE.Quaternion();
    this.q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around x
    this.deviceQuaternion = new THREE.Quaternion();
  }

  // Must be called from a user gesture for iOS 13+
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
    
    // Group holding all table 3D objects
    this.arAnchor = null;
    
    // Sub-objects
    this.flowerGroup = null;
    this.petals = [];
    this.ringGroup = null;
    this.diamond = null;
    this.diamondGlint = null;
    this.butterflies = [];
    this.particleSystem = null;
    this.fallingPetals = [];
    this.virtualTable = null;
    this.reticle = null;
    
    // Animation states
    this.bloomProgress = 0; // 0 (bud) to 1 (full bloom)
    this.targetBloom = 1.0;
    this.clock = new THREE.Clock();
    this.isCameraActive = false;
    
    // Fallback swipe tracking for desktop / non-gyro devices
    this.manualYaw = 0;
    this.manualPitch = 0;
    this.isDragging = false;
    this.lastPointer = { x: 0, y: 0 };
    
    // Scene mode toggles
    this.mode = 'all'; // 'all', 'flowers', 'rings', 'butterflies'

    // Real Table Surface Calibration & Anchoring
    this.tableHeight = -0.62;
    this.hasCalibratedTable = false;

    this.initScene();
  }

  initScene() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.camera.position.set(0, 1.6, 2.5);
    this.camera.lookAt(0, 0.25, 0);

    // 3. Renderer with transparent background for WebAR overlay
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls (Active in Virtual 3D mode)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 5.0;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.set(0, 0.25, 0);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.4;

    // 5. Gyroscope Orientation Manager (Active in Camera AR mode)
    this.gyroManager = new DeviceOrientationManager(this.camera);

    // 6. Lighting
    this.setupLighting();

    // 7. Main AR Anchor Group (holds the rings, flowers, butterflies)
    this.arAnchor = new THREE.Group();
    this.arAnchor.position.set(0, 0, 0);
    this.scene.add(this.arAnchor);

    // 8. Build 3D Elements
    this.buildSurfaceReticle();
    this.buildVirtualBanquetTable();
    this.buildEnchantedFlowerCenterpiece();
    this.buildTwinWeddingRings();
    this.buildButterflies();
    this.buildFallingPetalsAndStardust();

    // 9. Event Listeners & Gestures
    window.addEventListener('resize', () => this.onWindowResize());
    this.setupGestures();

    // 10. Start Animation Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 1.2);
    this.scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xfff1cf, 3.5);
    spotLight.position.set(1.5, 4.0, 2.0);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.6;
    spotLight.decay = 1.2;
    spotLight.distance = 20;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.bias = -0.001;
    this.scene.add(spotLight);

    const rimLight = new THREE.DirectionalLight(0xffb7b2, 1.4);
    rimLight.position.set(-2, 2.5, -2);
    this.scene.add(rimLight);

    this.candleLight = new THREE.PointLight(0xff9933, 2.0, 4, 1.5);
    this.candleLight.position.set(0, 0.4, 0);
    this.scene.add(this.candleLight);
  }

  // Golden circular AR placement reticle & contact shadow on table
  buildSurfaceReticle() {
    // 1. Realistic soft contact shadow on real table surface
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(1.25, 1.25);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    this.contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.y = 0.001;
    this.arAnchor.add(this.contactShadow);

    // 2. Elegant Royal Gold Table Ring Reticle
    const ringGeo = new THREE.RingGeometry(0.35, 0.38, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.reticle = new THREE.Mesh(ringGeo, ringMat);
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.position.y = 0.005;

    const innerRingGeo = new THREE.RingGeometry(0.2, 0.22, 32);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xffe6a3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55
    });
    const innerMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    this.reticle.add(innerMesh);

    this.arAnchor.add(this.reticle);
  }

  // Photorealistic virtual banquet table
  buildVirtualBanquetTable() {
    this.virtualTable = new THREE.Group();

    const tableTopGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.08, 64);
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: 0x18241d,
      roughness: 0.4,
      metalness: 0.1
    });
    const tableMesh = new THREE.Mesh(tableTopGeo, tableTopMat);
    tableMesh.position.y = -0.04;
    tableMesh.receiveShadow = true;
    this.virtualTable.add(tableMesh);

    const tableRimGeo = new THREE.TorusGeometry(1.6, 0.02, 16, 64);
    const goldRimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.85
    });
    const rimMesh = new THREE.Mesh(tableRimGeo, goldRimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.002;
    this.virtualTable.add(rimMesh);

    const plateGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.015, 48);
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.15
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = 0.008;
    plate.receiveShadow = true;
    this.virtualTable.add(plate);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const candleHolder = new THREE.Group();
      candleHolder.position.set(Math.cos(angle) * 0.52, 0.02, Math.sin(angle) * 0.52);

      const glassGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.08, 24);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.1,
        transmission: 0.9,
        ior: 1.5
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      candleHolder.add(glass);

      const flameGeo = new THREE.SphereGeometry(0.012, 16, 16);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 0.03;
      candleHolder.add(flame);

      this.virtualTable.add(candleHolder);
    }

    this.arAnchor.add(this.virtualTable);
    this.virtualTable.visible = true;
  }

  // 3D Procedural Blooming Rose & Peony Centerpiece
  buildEnchantedFlowerCenterpiece() {
    this.flowerGroup = new THREE.Group();
    this.flowerGroup.position.set(0, 0.02, 0);

    const vaseGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.18, 32);
    const vaseMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.8,
      roughness: 0.2
    });
    const vase = new THREE.Mesh(vaseGeo, vaseMat);
    vase.position.y = 0.09;
    vase.castShadow = true;
    this.flowerGroup.add(vase);

    const vaseRingGeo = new THREE.TorusGeometry(0.182, 0.012, 16, 32);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.95,
      roughness: 0.15
    });
    const vaseRing = new THREE.Mesh(vaseRingGeo, goldMat);
    vaseRing.rotation.x = Math.PI / 2;
    vaseRing.position.y = 0.17;
    this.flowerGroup.add(vaseRing);

    const leafGeo = new THREE.ConeGeometry(0.06, 0.22, 5);
    leafGeo.rotateX(Math.PI / 2);
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x1f4e38,
      roughness: 0.4
    });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set(Math.cos(angle) * 0.16, 0.19, Math.sin(angle) * 0.16);
      leaf.rotation.y = -angle;
      leaf.rotation.x = 0.45;
      leaf.scale.set(1, 0.2, 1.4);
      this.flowerGroup.add(leaf);
    }

    this.petals = [];
    const petalsPerLayer = [4, 6, 8, 10, 12];

    const innerPetalMat = new THREE.MeshStandardMaterial({
      color: 0xc41e3a,
      roughness: 0.5,
      metalness: 0.1
    });
    const outerPetalMat = new THREE.MeshStandardMaterial({
      color: 0xd6336c,
      roughness: 0.45,
      metalness: 0.15
    });
    const goldTippedPetalMat = new THREE.MeshStandardMaterial({
      color: 0xe84a5f,
      roughness: 0.4,
      metalness: 0.2
    });

    petalsPerLayer.forEach((count, layerIdx) => {
      const layerRadius = 0.04 + layerIdx * 0.032;
      const layerHeight = 0.22 + (4 - layerIdx) * 0.015;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (layerIdx * 0.4);

        const petalShape = new THREE.SphereGeometry(0.07 + layerIdx * 0.016, 16, 16, 0, Math.PI, 0, Math.PI / 1.5);
        const mat = layerIdx === 0 ? innerPetalMat : (layerIdx === 4 ? goldTippedPetalMat : outerPetalMat);
        const petal = new THREE.Mesh(petalShape, mat);

        petal.castShadow = true;
        petal.receiveShadow = true;

        const petalPivot = new THREE.Group();
        petalPivot.position.set(0, layerHeight, 0);

        petal.position.set(Math.cos(angle) * layerRadius, 0, Math.sin(angle) * layerRadius);
        petal.rotation.y = -angle + Math.PI / 2;
        petal.rotation.x = 0.2;

        petalPivot.add(petal);
        this.flowerGroup.add(petalPivot);

        this.petals.push({
          pivot: petalPivot,
          mesh: petal,
          layer: layerIdx,
          angle: angle,
          baseRadius: layerRadius,
          closedRotX: 0.1 + layerIdx * 0.05,
          bloomedRotX: 0.4 + layerIdx * 0.22,
          closedScale: 0.35 + layerIdx * 0.12,
          bloomedScale: 1.0 + layerIdx * 0.18
        });
      }
    });

    const stamenCoreGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const stamenCoreMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.7,
      roughness: 0.3
    });
    const stamenCore = new THREE.Mesh(stamenCoreGeo, stamenCoreMat);
    stamenCore.position.y = 0.27;
    this.flowerGroup.add(stamenCore);

    this.arAnchor.add(this.flowerGroup);
  }

  // 3D Interlinked Champagne Gold & Platinum Diamond Wedding Rings
  buildTwinWeddingRings() {
    this.ringGroup = new THREE.Group();
    this.ringGroup.position.set(0, 0.32, 0);

    // Delicate Groom Ring (Champagne Gold)
    const groomRingGeo = new THREE.TorusGeometry(0.058, 0.009, 32, 64);
    const goldBandMat = new THREE.MeshStandardMaterial({
      color: 0xffd27d,
      metalness: 0.95,
      roughness: 0.12
    });
    const groomRing = new THREE.Mesh(groomRingGeo, goldBandMat);
    groomRing.rotation.x = Math.PI / 3;
    groomRing.rotation.y = 0.25;
    groomRing.castShadow = true;
    this.ringGroup.add(groomRing);

    // Delicate Bride Ring (Platinum & Diamond Solitaire)
    const brideRingGeo = new THREE.TorusGeometry(0.050, 0.007, 32, 64);
    const platinumBandMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      metalness: 0.98,
      roughness: 0.08
    });
    const brideRing = new THREE.Mesh(brideRingGeo, platinumBandMat);
    brideRing.rotation.x = Math.PI / 4;
    brideRing.rotation.y = -0.55;
    brideRing.position.set(0.022, 0.015, 0);
    brideRing.castShadow = true;

    // Diamond setting crown
    const crownGeo = new THREE.CylinderGeometry(0.013, 0.008, 0.012, 6);
    const crown = new THREE.Mesh(crownGeo, platinumBandMat);
    crown.position.set(0, 0.054, 0);
    brideRing.add(crown);

    // Solitaire Brilliant Diamond
    const diamondGeo = new THREE.OctahedronGeometry(0.018, 1);
    const diamondMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.05,
      roughness: 0.0,
      transmission: 0.95,
      ior: 2.42,
      thickness: 0.04,
      specularIntensity: 2.0,
      transparent: true,
      opacity: 0.95
    });
    this.diamond = new THREE.Mesh(diamondGeo, diamondMat);
    this.diamond.position.set(0, 0.064, 0);
    this.diamond.scale.set(1, 1.4, 1);
    brideRing.add(this.diamond);

    // Star sparkle glint
    const glintCanvas = document.createElement('canvas');
    glintCanvas.width = 64;
    glintCanvas.height = 64;
    const ctx = glintCanvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 235, 160, 0.8)');
    grad.addColorStop(0.6, 'rgba(212, 175, 55, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const glintTexture = new THREE.CanvasTexture(glintCanvas);
    const glintMat = new THREE.SpriteMaterial({
      map: glintTexture,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    this.diamondGlint = new THREE.Sprite(glintMat);
    this.diamondGlint.scale.set(0.08, 0.08, 1);
    this.diamond.add(this.diamondGlint);

    this.ringGroup.add(brideRing);
    this.arAnchor.add(this.ringGroup);
  }

  // 3D Animated Butterflies
  buildButterflies() {
    this.butterflies = [];
    const butterflyColors = [
      { wing: 0x4aa5ff, edge: 0xffffff, body: 0x222222, name: 'Morpho Blue' },
      { wing: 0xffd23f, edge: 0xff8c00, body: 0x332200, name: 'Golden Monarch' },
      { wing: 0xf3722c, edge: 0xf9c74f, body: 0x221100, name: 'Amber Sunset' },
      { wing: 0xf72585, edge: 0x7209b7, body: 0x220022, name: 'Royal Orchid' }
    ];

    butterflyColors.forEach((colorScheme, idx) => {
      const bGroup = new THREE.Group();

      const bodyGeo = new THREE.CylinderGeometry(0.005, 0.003, 0.05, 8);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorScheme.body });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      bGroup.add(body);

      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 0);
      wingShape.bezierCurveTo(0.04, 0.06, 0.09, 0.07, 0.11, 0.04);
      wingShape.bezierCurveTo(0.13, 0.01, 0.11, -0.04, 0.06, -0.05);
      wingShape.bezierCurveTo(0.03, -0.05, 0.01, -0.02, 0, 0);

      const wingGeo = new THREE.ShapeGeometry(wingShape);
      const wingMat = new THREE.MeshStandardMaterial({
        color: colorScheme.wing,
        roughness: 0.3,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92
      });

      const leftPivot = new THREE.Group();
      leftPivot.position.set(0.004, 0.005, 0);
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.scale.set(0.8, 0.8, 0.8);
      leftPivot.add(leftWing);
      bGroup.add(leftPivot);

      const rightPivot = new THREE.Group();
      rightPivot.position.set(-0.004, 0.005, 0);
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.scale.set(-0.8, 0.8, 0.8);
      rightPivot.add(rightWing);
      bGroup.add(rightPivot);

      const bGlowCanvas = document.createElement('canvas');
      bGlowCanvas.width = 32;
      bGlowCanvas.height = 32;
      const bCtx = bGlowCanvas.getContext('2d');
      const bGrad = bCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      bGrad.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
      bGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
      bGrad.addColorStop(1, 'rgba(0,0,0,0)');
      bCtx.fillStyle = bGrad;
      bCtx.fillRect(0, 0, 32, 32);

      const bGlowMat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(bGlowCanvas),
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      const bGlow = new THREE.Sprite(bGlowMat);
      bGlow.scale.set(0.12, 0.12, 1);
      bGroup.add(bGlow);

      this.butterflies.push({
        group: bGroup,
        leftPivot: leftPivot,
        rightPivot: rightPivot,
        speed: 0.8 + idx * 0.25,
        radiusX: 0.45 + idx * 0.14,
        radiusZ: 0.4 + idx * 0.12,
        baseY: 0.38 + idx * 0.08,
        flapSpeed: 14 + idx * 2,
        phase: (idx * Math.PI) / 2
      });

      this.arAnchor.add(bGroup);
    });
  }

  // Swirling Falling Petals Vortex & Golden Stardust Particles
  buildFallingPetalsAndStardust() {
    this.fallingPetals = [];
    const petalGeo = new THREE.SphereGeometry(0.022, 8, 8, 0, Math.PI, 0, Math.PI / 2);
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xee3e60,
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 45; i++) {
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(
        (Math.random() - 0.5) * 1.2,
        0.1 + Math.random() * 0.9,
        (Math.random() - 0.5) * 1.2
      );
      petal.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      petal.scale.set(1.2, 0.3, 1.6);

      this.fallingPetals.push({
        mesh: petal,
        rotSpeedX: (Math.random() - 0.5) * 2,
        rotSpeedY: (Math.random() - 0.5) * 2,
        fallSpeed: 0.15 + Math.random() * 0.12,
        driftAngle: Math.random() * Math.PI * 2
      });

      this.arAnchor.add(petal);
    }

    const stardustCount = 200;
    const stardustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(stardustCount * 3);
    const colors = new Float32Array(stardustCount * 3);

    const goldColor = new THREE.Color(0xffe28a);
    const whiteColor = new THREE.Color(0xffffff);

    for (let i = 0; i < stardustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = Math.random() * 1.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

      const c = Math.random() > 0.4 ? goldColor : whiteColor;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    stardustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    stardustGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const sCanvas = document.createElement('canvas');
    sCanvas.width = 16;
    sCanvas.height = 16;
    const sCtx = sCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    sGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sGrad.addColorStop(0.5, 'rgba(255, 220, 100, 0.8)');
    sGrad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 16, 16);

    const stardustMat = new THREE.PointsMaterial({
      size: 0.035,
      map: new THREE.CanvasTexture(sCanvas),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(stardustGeo, stardustMat);
    this.arAnchor.add(this.particleSystem);
  }

  // Gestures for Canvas Tap & Camera Pan in AR mode
  setupGestures() {
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerStartTime = 0;

    const onPointerDown = (e) => {
      this.isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      pointerStartX = clientX;
      pointerStartY = clientY;
      pointerStartTime = Date.now();
      this.lastPointer = { x: clientX, y: clientY };
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      if (e.touches && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const pinchDist = Math.hypot(dx, dy);
        if (this.initialPinchDistance) {
          const ratio = pinchDist / this.initialPinchDistance;
          this.currentScale = Math.max(0.35, Math.min(2.5, this.currentScale * (1 + (ratio - 1) * 0.12)));
          this.arAnchor.scale.set(this.currentScale, this.currentScale, this.currentScale);
        }
        this.initialPinchDistance = pinchDist;
        return;
      }

      if (this.isCameraActive) {
        const deltaX = clientX - this.lastPointer.x;
        const deltaY = clientY - this.lastPointer.y;
        
        // Horizontal swipe in AR mode adjusts the view rotation around the fixed table anchor
        this.gyroManager.userYawOffset += deltaX * 0.005;
        this.manualPitch = Math.max(-0.6, Math.min(0.6, this.manualPitch + deltaY * 0.003));
      }

      this.lastPointer = { x: clientX, y: clientY };
    };

    const onPointerUp = (e) => {
      this.isDragging = false;
      this.initialPinchDistance = null;
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      const dist = Math.hypot(clientX - pointerStartX, clientY - pointerStartY);
      const time = Date.now() - pointerStartTime;

      if (dist < 8 && time < 300) {
        if (this.isCameraActive) {
          this.placeAnchorOnTablePlane(clientX, clientY);
        }
        this.triggerMagicBurst();
      }
    };

    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
  }

  // Set Mode: Camera AR vs Virtual 3D Table
  setCameraARMode(active) {
    this.isCameraActive = active;

    if (active) {
      // In Camera AR mode:
      // The camera is at (0, 0, 0) tracking the real phone orientation.
      // The 3D rings and flowers are anchored naturally on the table plane
      this.virtualTable.visible = false;
      this.controls.enabled = false;
      this.camera.position.set(0, 0, 0);
      this.camera.quaternion.identity();
      this.hasCalibratedTable = false; // Will auto-calibrate to exact phone tilt
      this.placeAnchorOnTablePlane();
      this.gyroManager.resetHeading();
    } else {
      // In Virtual 3D mode:
      // OrbitControls allows full 360° mouse / swipe around the virtual banquet table.
      this.virtualTable.visible = true;
      this.controls.enabled = true;
      this.camera.position.set(0, 1.6, 2.5);
      this.camera.lookAt(0, 0.25, 0);
      this.arAnchor.position.set(0, 0, 0);
      this.controls.target.set(0, 0.25, 0);
    }
  }

  // Place Anchor on the Physical Horizontal Table Plane (Y = tableHeight)
  placeAnchorOnTablePlane(screenX = null, screenY = null) {
    let rayDir;
    if (screenX !== null && screenY !== null) {
      const ndcX = (screenX / window.innerWidth) * 2 - 1;
      const ndcY = -(screenY / window.innerHeight) * 2 + 1;
      const rayTarget = new THREE.Vector3(ndcX, ndcY, 0.5);
      rayTarget.unproject(this.camera);
      rayDir = rayTarget.sub(this.camera.position).normalize();
    } else {
      rayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    }

    // When phone is looking down at table (rayDir.y < -0.12):
    if (rayDir.y < -0.12) {
      // Intersect with horizontal table plane Y = this.tableHeight
      const t = this.tableHeight / rayDir.y;
      const dist = THREE.MathUtils.clamp(t, 0.5, 2.0);
      this.arAnchor.position.set(rayDir.x * dist, this.tableHeight, rayDir.z * dist);
    } else {
      // When phone is held horizontally or looking up, place forward on the table plane
      const forwardLen = Math.hypot(rayDir.x, rayDir.z) || 1;
      this.arAnchor.position.set((rayDir.x / forwardLen) * 0.95, this.tableHeight, (rayDir.z / forwardLen) * 0.95);
    }
  }

  // Re-center Anchor directly in front of current phone orientation on the table
  recenterAnchor() {
    this.gyroManager.resetHeading();
    this.manualPitch = 0;
    this.placeAnchorOnTablePlane();
    weddingAudio.playRingShimmer();
  }

  // Toggle Auto 360-degree rotation
  toggleAutoRotate() {
    if (this.controls && !this.isCameraActive) {
      this.controls.autoRotate = !this.controls.autoRotate;
      return this.controls.autoRotate;
    } else if (this.isCameraActive) {
      this.isAutoSpinningAR = !this.isAutoSpinningAR;
      return this.isAutoSpinningAR;
    }
    return false;
  }

  // Opening Animation when camera starts
  playOpeningAnimation() {
    this.bloomProgress = 0;
    this.targetBloom = 1.0;

    if (this.ringGroup) {
      this.ringGroup.scale.set(0.01, 0.01, 0.01);
      this.ringGroup.position.y = 0.65;

      const startTime = performance.now();
      const duration = 1200;

      const animateDrop = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1.0);

        const s = 1.70158;
        const t = progress - 1;
        const ease = t * t * ((s + 1) * t + s) + 1;

        const curScale = Math.max(0.01, ease);
        this.ringGroup.scale.set(curScale, curScale, curScale);
        this.ringGroup.position.y = 0.65 - ease * 0.33;

        if (progress < 1.0) {
          requestAnimationFrame(animateDrop);
        } else {
          this.ringGroup.position.y = 0.32;
          this.ringGroup.scale.set(1, 1, 1);
        }
      };
      requestAnimationFrame(animateDrop);
    }

    weddingAudio.playBloomSfx();
    weddingAudio.playRingShimmer();
  }

  // Interactive Tap Effect: Bloom / Butterflies flutter / Sparkles burst
  triggerMagicBurst() {
    weddingAudio.playButterflyFlutter();
    weddingAudio.playBloomSfx();

    this.targetBloom = this.bloomProgress < 0.5 ? 1.0 : 0.2;
    setTimeout(() => {
      this.targetBloom = 1.0;
    }, 1200);

    if (this.ringGroup) {
      this.ringGroup.position.y += 0.03;
      setTimeout(() => {
        if (this.ringGroup) this.ringGroup.position.y = 0.32;
      }, 500);
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

  setMode(mode) {
    this.mode = mode;
    if (mode === 'all') {
      this.flowerGroup.visible = true;
      this.ringGroup.visible = true;
      this.butterflies.forEach(b => b.group.visible = true);
    } else if (mode === 'flowers') {
      this.flowerGroup.visible = true;
      this.ringGroup.visible = false;
      this.butterflies.forEach(b => b.group.visible = false);
    } else if (mode === 'rings') {
      this.flowerGroup.visible = false;
      this.ringGroup.visible = true;
      this.butterflies.forEach(b => b.group.visible = false);
    } else if (mode === 'butterflies') {
      this.flowerGroup.visible = true;
      this.ringGroup.visible = false;
      this.butterflies.forEach(b => b.group.visible = true);
    }
  }

  triggerBloom() {
    this.bloomProgress = 0;
    this.targetBloom = 1.0;
    weddingAudio.playBloomSfx();
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

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = Math.max(width * 0.008, 4);
    ctx.strokeRect(20, 20, width - 40, height - 40);

    ctx.strokeStyle = 'rgba(243, 229, 171, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    const bannerHeight = 85;
    const bannerY = height - 35 - bannerHeight;
    ctx.fillStyle = 'rgba(10, 20, 16, 0.82)';
    ctx.fillRect(30, bannerY, width - 60, bannerHeight);

    ctx.fillStyle = '#d4af37';
    ctx.fillRect(30, bannerY, width - 60, 2);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f3e5ab';
    ctx.font = `bold ${Math.max(Math.floor(width * 0.04), 22)}px 'Playfair Display', serif`;
    ctx.fillText(`Walimatulurus ${coupleName}`, width / 2, bannerY + 38);

    ctx.fillStyle = '#d4af37';
    ctx.font = `${Math.max(Math.floor(width * 0.024), 14)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText(`✨ ${tableInfo} • Magic Table AR ✨`, width / 2, bannerY + 65);

    return snapshotCanvas.toDataURL('image/png');
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

    // 0. Update Camera Orientation
    if (this.isCameraActive) {
      if (this.isAutoSpinningAR) {
        this.gyroManager.userYawOffset += delta * 0.8;
      }

      const hasGyro = this.gyroManager.update();
      if (hasGyro) {
        // Auto-calibrate table anchor on first genuine tilt angle reading
        if (!this.hasCalibratedTable) {
          this.hasCalibratedTable = true;
          this.placeAnchorOnTablePlane();
        }
      } else {
        // Fallback for desktop camera without gyro: use manual swipe yaw/pitch
        const euler = new THREE.Euler(this.manualPitch, this.gyroManager.userYawOffset, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
      }
    } else {
      if (this.controls) {
        this.controls.update();
      }
    }

    // 1. Smooth Petal Blooming Morph Animation
    this.bloomProgress += (this.targetBloom - this.bloomProgress) * 0.04;
    this.petals.forEach((p) => {
      const curTilt = p.closedRotX + (p.bloomedRotX - p.closedRotX) * this.bloomProgress;
      p.mesh.rotation.x = curTilt;

      const curScale = p.closedScale + (p.bloomedScale - p.closedScale) * this.bloomProgress;
      p.mesh.scale.set(curScale, curScale, curScale);
    });

    // 2. Twin Wedding Rings Hover & Sparkle Rotation
    if (this.ringGroup) {
      this.ringGroup.position.y = 0.32 + Math.sin(time * 1.8) * 0.015;
      this.ringGroup.rotation.y = time * 0.45;

      if (this.diamondGlint) {
        const glintScale = 0.08 + Math.sin(time * 6) * 0.03;
        this.diamondGlint.scale.set(glintScale, glintScale, 1);
        if (this.diamondGlint.material) {
          this.diamondGlint.material.rotation = time * 1.5;
        }
      }
    }

    // 3. Butterflies Flight Paths & Realistic Flapping
    this.butterflies.forEach((b) => {
      const angle = time * b.speed + b.phase;
      const x = Math.sin(angle) * b.radiusX;
      const z = Math.cos(angle * 1.3) * b.radiusZ;
      const y = b.baseY + Math.sin(angle * 2.2) * 0.12;

      b.group.position.set(x, y, z);

      const nextAngle = angle + 0.05;
      const nextX = Math.sin(nextAngle) * b.radiusX;
      const nextZ = Math.cos(nextAngle * 1.3) * b.radiusZ;
      b.group.rotation.y = Math.atan2(nextX - x, nextZ - z);

      const flapAngle = Math.sin(time * b.flapSpeed) * 0.85;
      b.leftPivot.rotation.z = flapAngle;
      b.rightPivot.rotation.z = -flapAngle;
    });

    // 4. Falling Rose Petals Vortex Physics
    this.fallingPetals.forEach((p) => {
      p.mesh.position.y -= p.fallSpeed * delta;
      p.mesh.position.x += Math.sin(time + p.driftAngle) * 0.003;
      p.mesh.position.z += Math.cos(time + p.driftAngle) * 0.003;

      p.mesh.rotation.x += p.rotSpeedX * delta;
      p.mesh.rotation.y += p.rotSpeedY * delta;

      if (p.mesh.position.y < 0.02) {
        p.mesh.position.y = 0.9 + Math.random() * 0.3;
        p.mesh.position.x = (Math.random() - 0.5) * 1.1;
        p.mesh.position.z = (Math.random() - 0.5) * 1.1;
      }
    });

    // 5. Stardust Golden Twinkle
    if (this.particleSystem) {
      this.particleSystem.rotation.y = time * 0.08;
    }

    // 6. Candlelight subtle flicker
    if (this.candleLight) {
      this.candleLight.intensity = 1.8 + Math.sin(time * 8) * 0.2 + (Math.random() - 0.5) * 0.1;
    }

    // 7. Reticle pulse
    if (this.reticle) {
      const pulse = 1.0 + Math.sin(time * 3) * 0.06;
      this.reticle.scale.set(pulse, pulse, pulse);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
