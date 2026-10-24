import { WeddingARScene } from './arScene.js';
import { TableCardGenerator } from './qrGenerator.js';
import { WishingWall } from './wishingWall.js';
import { weddingAudio } from './audio.js';
import { MindARController } from './mindarController.js';

// Application State
const appState = {
  currentView: 'virtual-3d', // 'ar-camera', 'virtual-3d', 'table-card'
  currentTheme: 'gold',      // 'gold', 'cyan', 'ruby'
  isMusicPlaying: false,
  isAnimationPaused: false,
  weddingInfo: TableCardGenerator.parseUrlParams()
};

// DOM Elements
const canvas = document.getElementById('ar-webgl-canvas');
const video = document.getElementById('ar-video-feed');
const mindarContainer = document.getElementById('ar-mindar-container');

const headerCoupleName = document.getElementById('header-couple-name');
const headerTableBadge = document.getElementById('header-table-badge');
const badgeTableText = document.getElementById('badge-table-text');
const btnToggleMusic = document.getElementById('btn-toggle-music');
const musicIcon = document.getElementById('music-icon');
const btnToggleGenerator = document.getElementById('btn-toggle-generator');
const btnExitAr = document.getElementById('btn-exit-ar');

const tabBtnCamera = document.getElementById('tab-btn-camera');
const tabBtnVirtual = document.getElementById('tab-btn-virtual');
const tabBtnCard = document.getElementById('tab-btn-card');
const guidanceText = document.getElementById('guidance-text');
const bottomHud = document.getElementById('bottom-hud');

// Scanner Overlay
const arScannerOverlay = document.getElementById('ar-scanner-overlay');
const scannerStatusText = document.getElementById('scanner-status-text');
const btnSnapLock = document.getElementById('btn-snap-lock');

// 360 Rotation & Position Controls
const btnToggleRotate = document.getElementById('btn-toggle-rotate');
const btnRecenterAnchor = document.getElementById('btn-recenter-anchor');
const btnVoiceGreeting = document.getElementById('btn-voice-greeting');

// Interactive HUD Controls (Matching User Infographic Screen 4)
const btnTogglePause = document.getElementById('btn-toggle-pause');
const pauseIcon = document.getElementById('pause-icon');
const pauseText = document.getElementById('pause-text');
const btnTapInteract = document.getElementById('btn-tap-interact');

// Welcome Entry Modal
const welcomeModal = document.getElementById('welcome-modal');
const btnStartCameraExperience = document.getElementById('btn-start-camera-experience');
const btnStart3dExperience = document.getElementById('btn-start-3d-experience');
const btnLandingShowCard = document.getElementById('btn-landing-show-card');

const cardGeneratorScreen = document.getElementById('card-generator-screen');
const btnTakeSnapshot = document.getElementById('btn-take-snapshot');
const btnOpenWishes = document.getElementById('btn-open-wishes');

const wishingModal = document.getElementById('wishing-modal');
const btnCloseWishes = document.getElementById('btn-close-wishes');
const formNewWish = document.getElementById('form-new-wish');
const inputWishName = document.getElementById('input-wish-name');
const inputWishTable = document.getElementById('input-wish-table');
const inputWishMsg = document.getElementById('input-wish-msg');
const wishesStreamContainer = document.getElementById('wishes-stream-container');

const snapshotModal = document.getElementById('snapshot-modal');
const btnCloseSnap = document.getElementById('btn-close-snap');
const snapshotPreviewImg = document.getElementById('snapshot-preview-img');
const btnDownloadSnap = document.getElementById('btn-download-snap');
const btnShareSnap = document.getElementById('btn-share-snap');

// Instantiate Core Engines
const arScene = new WeddingARScene(canvas, video, mindarContainer);
const cardGen = new TableCardGenerator('generator-mount-point');
const wishingWall = new WishingWall();
const mindarCtrl = new MindARController(appState.weddingInfo.couple);

// Real-time Computer Vision Callback when target image is found or lost by MindAR
mindarCtrl.onStatusChange = (found) => {
  if (scannerStatusText) {
    if (found) {
      scannerStatusText.textContent = '✨ FOTO PENGANTIN DIKESAN! VIDEO KAHWIN BERMAIN ✨';
      if (guidanceText) guidanceText.textContent = '🎬 Foto pengantin dikesan! Saksikan video kahwin bermain terus di atas kad anda!';
    } else {
      scannerStatusText.textContent = 'Mengesan Foto Pengantin Pada Kad...';
      if (guidanceText) guidanceText.textContent = '📸 Halakan kamera ke arah gambar pengantin untuk memainkan video kahwin!';
    }
  }
};

arScene.onTargetStatusChange = (found) => {
  if (scannerStatusText) {
    if (found) {
      scannerStatusText.textContent = '✨ FOTO PENGANTIN DIKESAN! VIDEO KAHWIN DIMAINKAN ✨';
      if (guidanceText) guidanceText.textContent = '🎬 Foto dikesan! Video kahwin bermain di atas foto anda!';
    } else {
      scannerStatusText.textContent = 'Mengesan Foto Pengantin Pada Kad...';
      if (guidanceText) guidanceText.textContent = '📸 Halakan kamera ke arah gambar pengantin untuk memainkan video kahwin!';
    }
  }
};

// -----------------------------------------------------------------------------
// 1. Initialize Wedding Info from URL / Defaults
// -----------------------------------------------------------------------------
function initWeddingData() {
  const { couple, table } = appState.weddingInfo;
  if (headerCoupleName) headerCoupleName.textContent = couple;
  if (badgeTableText) badgeTableText.textContent = table;
  if (inputWishTable) inputWishTable.value = table;

  arScene.coupleName = couple;
}

// -----------------------------------------------------------------------------
// 2. View Mode Controller (Camera AR vs Virtual 3D Card vs Printable Generator)
// -----------------------------------------------------------------------------
async function setView(viewName) {
  appState.currentView = viewName;

  [tabBtnCamera, tabBtnVirtual, tabBtnCard].forEach(btn => btn?.classList.remove('active'));

  if (viewName === 'ar-camera') {
    document.body.classList.add('ar-camera-active');
    document.getElementById('app')?.classList.add('ar-camera-active');

    tabBtnCamera?.classList.add('active');
    cardGeneratorScreen?.classList.add('hidden');
    bottomHud?.classList.remove('hidden');
    arScannerOverlay?.classList.remove('hidden');
    welcomeModal?.classList.add('hidden');

    guidanceText.textContent = '📸 Halakan kamera ke arah gambar pengantin untuk saksikan gambar bergerak!';
    if (scannerStatusText) scannerStatusText.textContent = 'Mengesan Foto Pengantin Pada Kad...';

    // Prepare arScene: hides virtual table, 3D card mesh, and contact shadow
    arScene.setCameraARMode(true);

    // 1. Start MindAR true computer vision image tracking (Stories AR Experience)
    let mindarStarted = false;
    try {
      mindarStarted = await mindarCtrl.start();
    } catch (e) {
      console.warn('[MindAR] direct start deferred:', e);
    }

    if (mindarStarted) {
      // Hide fallback Three.js canvas so MindAR full-screen image target camera runs cleanly
      if (canvas) canvas.classList.add('hidden');
    } else {
      // Fallback: Three.js transparent overlay + camera feed
      if (canvas) canvas.classList.remove('hidden');
      await arScene.startCamera();
    }
  } else if (viewName === 'virtual-3d') {
    document.body.classList.remove('ar-camera-active');
    document.getElementById('app')?.classList.remove('ar-camera-active');
    if (canvas) canvas.classList.remove('hidden');

    tabBtnVirtual?.classList.add('active');
    cardGeneratorScreen?.classList.add('hidden');
    bottomHud?.classList.remove('hidden');
    arScannerOverlay?.classList.add('hidden');

    mindarCtrl.stop();
    arScene.stopCamera();
    arScene.setCameraARMode(false);
    guidanceText.textContent = '🥂 Simulasi Kad 3D • Sentuh foto pengantin untuk melihat foto hidup & terapung!';
  } else if (viewName === 'table-card') {
    document.body.classList.remove('ar-camera-active');
    document.getElementById('app')?.classList.remove('ar-camera-active');
    if (canvas) canvas.classList.add('hidden');

    tabBtnCard?.classList.add('active');
    cardGeneratorScreen?.classList.remove('hidden');
    bottomHud?.classList.add('hidden');
    arScannerOverlay?.classList.add('hidden');

    mindarCtrl.stop();
    arScene.stopCamera();
    arScene.setCameraARMode(false);
    cardGen.renderCard();
  }
}

// -----------------------------------------------------------------------------
function unlockWeddingVideoAudio() {
  const vid = document.getElementById('custom-wedding-video');
  if (vid) {
    vid.muted = false;
    vid.volume = 1.0;
    const p = vid.play();
    if (p !== undefined) {
      p.then(() => {
        vid.pause();
        vid.currentTime = 0;
      }).catch(() => {});
    }
  }
}

// -----------------------------------------------------------------------------
// 3. Welcome / Landing Page Actions
// -----------------------------------------------------------------------------
btnStartCameraExperience?.addEventListener('click', async () => {
  await arScene.gyroManager.requestPermission();
  welcomeModal?.classList.add('hidden');

  // Pre-load and unlock wedding video audio with user tap gesture
  unlockWeddingVideoAudio();

  await setView('ar-camera');
  weddingAudio.init();
});

btnStart3dExperience?.addEventListener('click', () => {
  welcomeModal?.classList.add('hidden');
  setView('virtual-3d');
  arScene.triggerMagneticSnap();
  weddingAudio.init();
});

btnLandingShowCard?.addEventListener('click', () => {
  welcomeModal?.classList.add('hidden');
  setView('table-card');
});

btnExitAr?.addEventListener('click', () => {
  arScene.stopCamera();
  welcomeModal?.classList.remove('hidden');
});

// Quick lock button inside scanner overlay
btnSnapLock?.addEventListener('click', () => {
  if (scannerStatusText) scannerStatusText.textContent = '✨ ANIMASI 3D DIKUNCI & DIAKTIFKAN! ✨';
  arScene.triggerMagneticSnap();
});

// -----------------------------------------------------------------------------
// 4. Interactive HUD Controls (Matching User Infographic Screen 4)
// -----------------------------------------------------------------------------
// Pause / Play Toggle
btnTogglePause?.addEventListener('click', () => {
  appState.isAnimationPaused = !appState.isAnimationPaused;
  arScene.isAnimationPaused = appState.isAnimationPaused;

  if (pauseIcon) pauseIcon.textContent = appState.isAnimationPaused ? '▶' : '⏸';
  if (pauseText) pauseText.textContent = appState.isAnimationPaused ? 'Main' : 'Jeda';
  btnTogglePause?.classList.toggle('active', appState.isAnimationPaused);
});

// Tap to Interact
btnTapInteract?.addEventListener('click', () => {
  arScene.triggerMagneticSnap();
});

// 360 Rotation & Position Reset
btnToggleRotate?.addEventListener('click', () => {
  const isRotating = arScene.toggleAutoRotate();
  btnToggleRotate.classList.toggle('active', isRotating);
});

btnRecenterAnchor?.addEventListener('click', () => {
  arScene.recenterAnchor();
  guidanceText.textContent = '🎯 Animasi diletakkan semula tepat di hadapan anda!';
});

// Voice Greeting Playback Button
btnVoiceGreeting?.addEventListener('click', () => {
  weddingAudio.speakGreeting(appState.weddingInfo.couple);
  btnVoiceGreeting.classList.add('active');
  setTimeout(() => {
    btnVoiceGreeting.classList.remove('active');
  }, 3000);
});

// -----------------------------------------------------------------------------
// 5. Audio & Music Controller
// -----------------------------------------------------------------------------
btnToggleMusic?.addEventListener('click', () => {
  const isPlaying = weddingAudio.toggleMusic();
  appState.isMusicPlaying = isPlaying;
  musicIcon.textContent = isPlaying ? '🔊' : '🎵';
  if (isPlaying) {
    btnToggleMusic.style.borderColor = 'var(--color-gold-primary)';
    btnToggleMusic.style.boxShadow = '0 0 12px var(--color-gold-glow)';
  } else {
    btnToggleMusic.style.borderColor = 'rgba(212, 175, 55, 0.4)';
    btnToggleMusic.style.boxShadow = 'none';
  }
});

window.addEventListener('pointerdown', () => {
  weddingAudio.init();
  unlockWeddingVideoAudio();
}, { once: true });

window.addEventListener('touchstart', () => {
  unlockWeddingVideoAudio();
}, { once: true });

// -----------------------------------------------------------------------------
// 6. Hologram Theme Chips (Gold, Cyan, Ruby)
// -----------------------------------------------------------------------------
document.querySelectorAll('.filter-chip[data-theme]').forEach(chip => {
  chip.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-chip[data-theme]').forEach(c => c.classList.remove('active'));
    e.currentTarget.classList.add('active');

    const theme = e.currentTarget.getAttribute('data-theme');
    appState.currentTheme = theme;
    arScene.setTheme(theme);
  });
});

// -----------------------------------------------------------------------------
// 7. Interactive Snapshot & Wishing Wall
// -----------------------------------------------------------------------------
btnTakeSnapshot?.addEventListener('click', () => {
  const couple = appState.weddingInfo.couple;
  const table = appState.weddingInfo.table;
  const snapshotDataUrl = arScene.captureSnapshot(couple, table);

  snapshotPreviewImg.src = snapshotDataUrl;
  btnDownloadSnap.href = snapshotDataUrl;
  btnDownloadSnap.download = `ARKadKahwin-${couple.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

  snapshotModal.classList.remove('hidden');
  weddingAudio.playMagneticSnap();
});

btnCloseSnap?.addEventListener('click', () => {
  snapshotModal.classList.add('hidden');
});

btnShareSnap?.addEventListener('click', async () => {
  const dataUrl = snapshotPreviewImg.src;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'ARKadKahwin.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `AR Kad Kahwin — Walimatulurus ${appState.weddingInfo.couple}`,
        text: `Saksikan foto pengantin pada kad kahwin ${appState.weddingInfo.couple} hidup sebagai animasi 3D! ✨`,
        files: [file]
      });
    } else {
      window.open(dataUrl, '_blank');
    }
  } catch (err) {
    console.warn('Share not supported or dismissed', err);
  }
});

function renderWishes() {
  if (wishesStreamContainer) {
    wishesStreamContainer.innerHTML = wishingWall.renderWishesList();
  }
}

btnOpenWishes?.addEventListener('click', () => {
  renderWishes();
  wishingModal.classList.remove('hidden');
});

btnCloseWishes?.addEventListener('click', () => {
  wishingModal.classList.add('hidden');
});

document.querySelectorAll('.preset-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    inputWishMsg.value = btn.textContent;
    inputWishMsg.focus();
  });
});

formNewWish?.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = inputWishName.value;
  const table = inputWishTable.value;
  const msg = inputWishMsg.value;

  if (!msg.trim()) return;

  wishingWall.addWish(name, table, msg);
  inputWishMsg.value = '';
  renderWishes();

  setTimeout(() => {
    wishingModal.classList.add('hidden');
  }, 1200);
});

[wishingModal, snapshotModal].forEach(modal => {
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

// -----------------------------------------------------------------------------
// 8. Navigation & Mode Switch Events
// -----------------------------------------------------------------------------
tabBtnCamera?.addEventListener('click', async () => {
  await arScene.gyroManager.requestPermission();
  unlockWeddingVideoAudio();
  setView('ar-camera');
});
tabBtnVirtual?.addEventListener('click', () => setView('virtual-3d'));
tabBtnCard?.addEventListener('click', () => setView('table-card'));
btnToggleGenerator?.addEventListener('click', () => setView('table-card'));
btnExitAr?.addEventListener('click', () => setView('virtual-3d'));

window.addEventListener('switch-to-ar', (e) => {
  if (e.detail) {
    appState.weddingInfo = {
      couple: e.detail.coupleName,
      table: e.detail.tableNumber,
      theme: e.detail.tableTheme,
      date: e.detail.weddingDate,
      venue: e.detail.venue
    };
    initWeddingData();
  }
  setView('ar-camera');
});

// -----------------------------------------------------------------------------
// 9. QR Code Initializer for Stories AR Hero Card
// -----------------------------------------------------------------------------
async function initStoriesDemoQR() {
  const qrImg = document.getElementById('stories-hero-qr');
  if (qrImg) {
    const qrDataUrl = await cardGen.getQRCodeDataUrl();
    qrImg.src = qrDataUrl;
  }
}

// -----------------------------------------------------------------------------
// 10. Start Application
// -----------------------------------------------------------------------------
initWeddingData();
initStoriesDemoQR();

// If user arrived by scanning the QR code, jump straight to camera AR scanner!
if (appState.weddingInfo.autoScan) {
  welcomeModal?.classList.add('hidden');
  setView('ar-camera');
} else {
  // Otherwise display the Stories AR Live Demo screen (Image 2)
  welcomeModal?.classList.remove('hidden');
  setView('virtual-3d');
}
