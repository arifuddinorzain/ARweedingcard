import * as THREE from 'three';
import { weddingAudio } from './audio.js';

export class WeddingARScene {
  constructor(canvasElement, videoElement) {
    this.canvas = canvasElement;
    this.video = videoElement;
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
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
    this.isVirtualTableVisible = false;
    this.isReticleVisible = true;
    
    // Interaction states
    this.isDragging = false;
    this.previousTouchPosition = { x: 0, y: 0 };
    this.initialPinchDistance = null;
    this.currentScale = 1.0;
    
    // Scene mode toggles
    this.mode = 'all'; // 'all', 'flowers', 'rings', 'butterflies'

    this.initScene();
  }

  initScene() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.camera.position.set(0, 1.8, 2.6);
    this.camera.lookAt(0, 0.3, 0);

    // 3. Renderer with transparent background for WebAR overlay
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true // crucial for taking AR photo snapshots!
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Lighting
    this.setupLighting();

    // 5. Main AR Anchor Group
    this.arAnchor = new THREE.Group();
    this.arAnchor.position.set(0, 0, 0);
    this.scene.add(this.arAnchor);

    // 6. Build 3D Elements
    this.buildSurfaceReticle();
    this.buildVirtualBanquetTable();
    this.buildEnchantedFlowerCenterpiece();
    this.buildTwinWeddingRings();
    this.buildButterflies();
    this.buildFallingPetalsAndStardust();

    // 7. Event Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    this.setupGestures();

    // 8. Start Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLighting() {
    // Warm romantic ambient light
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 1.2);
    this.scene.add(ambientLight);

    // Golden spotlight simulating elegant chandelier / banquet spotlight
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

    // Soft rose gold rim light from behind
    const rimLight = new THREE.DirectionalLight(0xffb7b2, 1.4);
    rimLight.position.set(-2, 2.5, -2);
    this.scene.add(rimLight);

    // Candlelight point light hovering near centerpiece
    this.candleLight = new THREE.PointLight(0xff9933, 2.0, 4, 1.5);
    this.candleLight.position.set(0, 0.4, 0);
    this.scene.add(this.candleLight);
  }

  // Golden circular AR placement reticle on table
  buildSurfaceReticle() {
    const ringGeo = new THREE.RingGeometry(0.35, 0.38, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.reticle = new THREE.Mesh(ringGeo, ringMat);
    this.reticle.rotation.x = -Math.PI / 2;
    this.reticle.position.y = 0.005;

    // Inner dashed accent
    const innerRingGeo = new THREE.RingGeometry(0.2, 0.22, 32);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xffe6a3,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const innerMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    this.reticle.add(innerMesh);

    this.scene.add(this.reticle);
  }

  // Photorealistic virtual banquet table (used when camera is off or in 3D simulator mode)
  buildVirtualBanquetTable() {
    this.virtualTable = new THREE.Group();

    // Tabletop - Luxurious Ivory/Champagne Silk Tablecloth with soft sheen
    const tableTopGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.08, 64);
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: 0x18241d, // Deep Emerald & Velvet Navy wedding banquet theme
      roughness: 0.4,
      metalness: 0.1
    });
    const tableMesh = new THREE.Mesh(tableTopGeo, tableTopMat);
    tableMesh.position.y = -0.04;
    tableMesh.receiveShadow = true;
    this.virtualTable.add(tableMesh);

    // Golden embossed table rim
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

    // Centerpiece Mirror Charger Plate
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

    // 4 Floating Candle Holders around centerpiece
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

      // Candle Flame Glow
      const flameGeo = new THREE.SphereGeometry(0.012, 16, 16);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 0.03;
      candleHolder.add(flame);

      this.virtualTable.add(candleHolder);
    }

    this.arAnchor.add(this.virtualTable);
    // Initially show virtual table; hide it when user switches to real camera AR
    this.virtualTable.visible = true;
  }

  // 3D Procedural Blooming Rose & Peony Centerpiece
  buildEnchantedFlowerCenterpiece() {
    this.flowerGroup = new THREE.Group();
    this.flowerGroup.position.set(0, 0.02, 0);

    // Elegant Gold / Marble Pedestal Vase
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

    // Gold Trim on Vase
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

    // Lush Emerald Foliage / Leaves Base
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

    // Procedural Blooming Petals
    // Multi-layered rose/peony bud with organic curve
    this.petals = [];
    const petalLayers = 5;
    const petalsPerLayer = [4, 6, 8, 10, 12];

    // Petal Shader / Material (Warm Romantic Royal Burgundy / Velvet Rose)
    const innerPetalMat = new THREE.MeshStandardMaterial({
      color: 0xc41e3a, // Crimson Velvet
      roughness: 0.5,
      metalness: 0.1
    });
    const outerPetalMat = new THREE.MeshStandardMaterial({
      color: 0xd6336c, // Radiant Rose
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

        // Curved petal geometry
        const petalShape = new THREE.SphereGeometry(0.07 + layerIdx * 0.016, 16, 16, 0, Math.PI, 0, Math.PI / 1.5);
        const mat = layerIdx === 0 ? innerPetalMat : (layerIdx === 4 ? goldTippedPetalMat : outerPetalMat);
        const petal = new THREE.Mesh(petalShape, mat);

        petal.castShadow = true;
        petal.receiveShadow = true;

        // Anchor pivot group for smooth blooming rotation
        const petalPivot = new THREE.Group();
        petalPivot.position.set(0, layerHeight, 0);

        petal.position.set(Math.cos(angle) * layerRadius, 0, Math.sin(angle) * layerRadius);
        petal.rotation.y = -angle + Math.PI / 2;
        petal.rotation.x = 0.2; // initial closed tilt

        petalPivot.add(petal);
        this.flowerGroup.add(petalPivot);

        // Save data for dynamic bloom morphing
        this.petals.push({
          pivot: petalPivot,
          mesh: petal,
          layer: layerIdx,
          angle: angle,
          baseRadius: layerRadius,
          closedRotX: 0.1 + layerIdx * 0.05,
          bloomedRotX: 0.4 + layerIdx * 0.22, // tilts outwards when blooming
          closedScale: 0.35 + layerIdx * 0.12,
          bloomedScale: 1.0 + layerIdx * 0.18
        });
      }
    });

    // Golden Stamens inside flower center
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
    this.ringGroup.position.set(0, 0.48, 0); // Floats above flower centerpiece

    // 1. Groom's Ring - Classic Wide Champagne Gold Band
    const groomRingGeo = new THREE.TorusGeometry(0.12, 0.018, 32, 64);
    const goldBandMat = new THREE.MeshStandardMaterial({
      color: 0xffd27d, // Champagne Gold
      metalness: 0.95,
      roughness: 0.12
    });
    const groomRing = new THREE.Mesh(groomRingGeo, goldBandMat);
    groomRing.rotation.x = Math.PI / 3;
    groomRing.rotation.y = 0.25;
    groomRing.castShadow = true;
    this.ringGroup.add(groomRing);

    // 2. Bride's Ring - Platinum Solitaire Ring with Diamond
    const brideRingGeo = new THREE.TorusGeometry(0.105, 0.014, 32, 64);
    const platinumBandMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5, // Pure Platinum / White Gold
      metalness: 0.98,
      roughness: 0.08
    });
    const brideRing = new THREE.Mesh(brideRingGeo, platinumBandMat);
    brideRing.rotation.x = Math.PI / 4;
    brideRing.rotation.y = -0.55;
    brideRing.position.set(0.045, 0.03, 0);
    brideRing.castShadow = true;

    // Diamond Crown Mount (6 tiny prongs)
    const crownGeo = new THREE.CylinderGeometry(0.026, 0.016, 0.024, 6);
    const crown = new THREE.Mesh(crownGeo, platinumBandMat);
    crown.position.set(0, 0.11, 0);
    brideRing.add(crown);

    // Brilliant Solitaire Diamond (Faceted Octahedron/Cone geometry)
    const diamondGeo = new THREE.OctahedronGeometry(0.035, 1);
    const diamondMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.05,
      roughness: 0.0,
      transmission: 0.95,
      ior: 2.42, // Real Diamond Refraction Index!
      thickness: 0.08,
      specularIntensity: 2.0,
      transparent: true,
      opacity: 0.95
    });
    this.diamond = new THREE.Mesh(diamondGeo, diamondMat);
    this.diamond.position.set(0, 0.13, 0);
    this.diamond.scale.set(1, 1.4, 1);
    brideRing.add(this.diamond);

    // Diamond Lens Flare / Sparkle Starburst
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
    this.diamondGlint.scale.set(0.18, 0.18, 1);
    this.diamond.add(this.diamondGlint);

    this.ringGroup.add(brideRing);
    this.arAnchor.add(this.ringGroup);
  }

  // 3D Animated Butterflies with organic wing flap and flight paths
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

      // Slender Torso
      const bodyGeo = new THREE.CylinderGeometry(0.005, 0.003, 0.05, 8);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorScheme.body });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      bGroup.add(body);

      // Wing Shape (Procedural 2D Shape with curves)
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

      // Left Wing Pivot
      const leftPivot = new THREE.Group();
      leftPivot.position.set(0.004, 0.005, 0);
      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.scale.set(0.8, 0.8, 0.8);
      leftPivot.add(leftWing);
      bGroup.add(leftPivot);

      // Right Wing Pivot
      const rightPivot = new THREE.Group();
      rightPivot.position.set(-0.004, 0.005, 0);
      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.scale.set(-0.8, 0.8, 0.8);
      rightPivot.add(rightWing);
      bGroup.add(rightPivot);

      // Glow Sprite attached to butterfly
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

      // Butterfly path parameters
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
    // 1. Falling 3D Rose Petals
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

    // 2. Sparkling Golden Stardust Points
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

    // Stardust Texture
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

  // Touch and Mouse Gesture Handling (Drag, Scale, Place)
  setupGestures() {
    // Mouse / Touch Drag to rotate or reposition
    const onPointerDown = (e) => {
      this.isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      this.previousTouchPosition = { x: clientX, y: clientY };

      if (e.touches && e.touches.length === 2) {
        // Pinch start
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.initialPinchDistance = Math.hypot(dx, dy);
      }
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;

      if (e.touches && e.touches.length === 2 && this.initialPinchDistance) {
        // Handle Pinch Zoom / Scale
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.hypot(dx, dy);
        const scaleFactor = currentDistance / this.initialPinchDistance;

        this.currentScale = Math.min(Math.max(this.currentScale * (1 + (scaleFactor - 1) * 0.08), 0.4), 2.5);
        this.arAnchor.scale.set(this.currentScale, this.currentScale, this.currentScale);
        this.initialPinchDistance = currentDistance;
        return;
      }

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - this.previousTouchPosition.x;

      // Smooth horizontal rotation of the wedding centerpiece
      this.arAnchor.rotation.y += deltaX * 0.008;

      this.previousTouchPosition = {
        x: clientX,
        y: e.touches ? e.touches[0].clientY : e.clientY
      };
    };

    const onPointerUp = () => {
      this.isDragging = false;
      this.initialPinchDistance = null;
    };

    this.canvas.addEventListener('mousedown', onPointerDown);
    this.canvas.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    this.canvas.addEventListener('touchstart', onPointerDown, { passive: true });
    this.canvas.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // Tap on screen to place centerpiece at reticle or trigger magical burst
    this.canvas.addEventListener('click', (e) => {
      this.triggerMagicBurst();
    });
  }

  // Interactive Tap Effect: Bloom / Butterflies flutter / Sparkles burst
  triggerMagicBurst() {
    weddingAudio.playButterflyFlutter();
    weddingAudio.playBloomSfx();

    // Trigger instant blooming flourish
    this.targetBloom = this.bloomProgress < 0.5 ? 1.0 : 0.2;
    setTimeout(() => {
      this.targetBloom = 1.0;
    }, 1200);

    // Gentle bounce animation on rings
    if (this.ringGroup) {
      this.ringGroup.position.y += 0.08;
      setTimeout(() => {
        if (this.ringGroup) this.ringGroup.position.y = 0.48;
      }, 500);
    }
  }

  // Start Real Mobile/Desktop Camera Feed for WebAR
  async startCamera() {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      await this.video.play();
      this.isCameraActive = true;

      // In real camera AR mode, hide the virtual wooden banquet table so user sees their actual table!
      if (this.virtualTable) {
        this.virtualTable.visible = false;
      }
      this.reticle.visible = true;
      return true;
    } catch (err) {
      console.warn('Camera access denied or unavailable, keeping virtual table mode.', err);
      this.isCameraActive = false;
      if (this.virtualTable) {
        this.virtualTable.visible = true;
      }
      return false;
    }
  }

  stopCamera() {
    if (this.video && this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
    }
    this.isCameraActive = false;
    if (this.virtualTable) {
      this.virtualTable.visible = true;
    }
  }

  // Switch between Experience Filter Modes
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

  // Trigger Bloom Animation Replay
  triggerBloom() {
    this.bloomProgress = 0;
    this.targetBloom = 1.0;
    weddingAudio.playBloomSfx();
  }

  // Capture High-Res Snapshot with Wedding Polaroid Frame
  captureSnapshot(coupleName = "Arif & Haziqah", tableInfo = "Meja 07 • Kasih Abadi") {
    // Create an offscreen canvas to composite: Camera Frame + WebGL 3D Canvas + Gold Wedding Frame
    const snapshotCanvas = document.createElement('canvas');
    const width = this.canvas.width;
    const height = this.canvas.height;
    snapshotCanvas.width = width;
    snapshotCanvas.height = height;
    const ctx = snapshotCanvas.getContext('2d');

    // 1. Draw Camera Feed if active, else luxury dark emerald gradient background
    if (this.isCameraActive && this.video.readyState >= 2) {
      // Draw camera image maintaining aspect ratio
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

    // 2. Draw 3D WebGL Canvas over video
    ctx.drawImage(this.canvas, 0, 0);

    // 3. Draw Luxury Gold Wedding Watermark Frame
    // Outer border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = Math.max(width * 0.008, 4);
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Inner subtle thin gold border
    ctx.strokeStyle = 'rgba(243, 229, 171, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(28, 28, width - 56, height - 56);

    // Bottom Wedding Banner
    const bannerHeight = 85;
    const bannerY = height - 35 - bannerHeight;
    ctx.fillStyle = 'rgba(10, 20, 16, 0.82)';
    ctx.fillRect(30, bannerY, width - 60, bannerHeight);

    // Gold divider line
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(30, bannerY, width - 60, 2);

    // Wedding Typography
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f3e5ab';
    ctx.font = `bold ${Math.max(Math.floor(width * 0.04), 22)}px 'Playfair Display', serif`;
    ctx.fillText(`Walimatulurus ${coupleName}`, width / 2, bannerY + 38);

    ctx.fillStyle = '#d4af37';
    ctx.font = `${Math.max(Math.floor(width * 0.024), 14)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText(`✨ ${tableInfo} • Magic Table AR ✨`, width / 2, bannerY + 65);

    // Return Data URL
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
      // Gentle levitation float
      this.ringGroup.position.y = 0.48 + Math.sin(time * 1.8) * 0.025;
      this.ringGroup.rotation.y = time * 0.45;

      // Diamond sparkle pulsing
      if (this.diamondGlint) {
        const glintScale = 0.16 + Math.sin(time * 6) * 0.06;
        this.diamondGlint.scale.set(glintScale, glintScale, 1);
        if (this.diamondGlint.material) {
          this.diamondGlint.material.rotation = time * 1.5;
        }
      }
    }

    // 3. Butterflies Flight Paths & Realistic Flapping
    this.butterflies.forEach((b) => {
      // 3D Lissajous Flight Orbit around centerpiece
      const angle = time * b.speed + b.phase;
      const x = Math.sin(angle) * b.radiusX;
      const z = Math.cos(angle * 1.3) * b.radiusZ;
      const y = b.baseY + Math.sin(angle * 2.2) * 0.12;

      b.group.position.set(x, y, z);

      // Orient butterfly along flight direction
      const nextAngle = angle + 0.05;
      const nextX = Math.sin(nextAngle) * b.radiusX;
      const nextZ = Math.cos(nextAngle * 1.3) * b.radiusZ;
      b.group.rotation.y = Math.atan2(nextX - x, nextZ - z);

      // Wing flap sinusoidal oscillation
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

      // Reset petal when hitting table plane
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
