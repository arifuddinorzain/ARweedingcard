import { WeddingARScene } from './arScene.js';
import { TableCardGenerator } from './qrGenerator.js';
import { WishingWall } from './wishingWall.js';
import { weddingAudio } from './audio.js';

// Application State
const appState = {
  currentView: 'virtual-3d', // 'ar-camera', 'virtual-3d', 'table-card'
  currentTheme: 'gold',      // 'gold', 'cyan', 'ruby'
  isMusicPlaying: false,
  weddingInfo: TableCardGenerator.parseUrlParams()
};

// DOM Elements
const canvas = document.getElementById('ar-webgl-canvas');
const video = document.getElementById('ar-video-feed');

const headerCoupleName = document.getElementById('header-couple-name');
const headerTableBadge = document.getElementById('header-table-badge');
const badgeTableText = document.getElementById('badge-table-text');
const btnToggleMusic = document.getElementById('btn-toggle-music');
const musicIcon = document.getElementById('music-icon');
const btnToggleGenerator = document.getElementById('btn-toggle-generator');

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

// Welcome Entry Modal
const welcomeModal = document.getElementById('welcome-modal');
const welcomeCoupleName = document.getElementById('welcome-couple-name');
const welcomeTableInfo = document.getElementById('welcome-table-info');
const btnStartCameraExperience = document.getElementById('btn-start-camera-experience');
const btnStart3dExperience = document.getElementById('btn-start-3d-experience');

const cardGeneratorScreen = document.getElementById('card-generator-screen');
const btnActivateBurst = document.getElementById('btn-activate-burst');
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
const arScene = new WeddingARScene(canvas, video);
const cardGen = new TableCardGenerator('generator-mount-point');
const wishingWall = new WishingWall();

// -----------------------------------------------------------------------------
// 1. Initialize Wedding Info from URL / Defaults
// -----------------------------------------------------------------------------
function initWeddingData() {
  const { couple, table, theme } = appState.weddingInfo;
  if (headerCoupleName) headerCoupleName.textContent = couple;
  if (badgeTableText) badgeTableText.textContent = table;
  if (inputWishTable) inputWishTable.value = table;
  if (welcomeCoupleName) welcomeCoupleName.textContent = couple;
  if (welcomeTableInfo) welcomeTableInfo.textContent = `${table} • ${theme || 'Kasih Abadi'}`;

  arScene.coupleName = couple;
}

// -----------------------------------------------------------------------------
// 2. View Mode Controller (Camera AR vs Virtual 3D Card vs Printable Generator)
// -----------------------------------------------------------------------------
async function setView(viewName) {
  appState.currentView = viewName;

  [tabBtnCamera, tabBtnVirtual, tabBtnCard].forEach(btn => btn?.classList.remove('active'));

  if (viewName === 'ar-camera') {
    tabBtnCamera?.classList.add('active');
    cardGeneratorScreen?.classList.add('hidden');
    bottomHud?.classList.remove('hidden');
    arScannerOverlay?.classList.remove('hidden');

    const success = await arScene.startCamera();
    if (success) {
      guidanceText.textContent = '🧲 Halakan kamera ke foto pengantin pada kad untuk melihat animasi AR Magnet!';
      if (scannerStatusText) scannerStatusText.textContent = 'Mengesan Foto Pengantin Pada Kad...';

      // Auto-trigger magnetic snap after 1.8 seconds of scanning
      setTimeout(() => {
        if (appState.currentView === 'ar-camera') {
          if (scannerStatusText) scannerStatusText.textContent = '🧲 KAD MAGNET DIKESAN! FOTO HIDUP DIAKTIFKAN ✨';
          arScene.triggerMagneticSnap();
        }
      }, 1800);
    } else {
      guidanceText.textContent = 'Mod Simulasi Kad 3D • Seret 360° untuk melihat kad & sentuh foto untuk animasi magnet!';
      arScannerOverlay?.classList.add('hidden');
      arScene.setCameraARMode(false);
    }
  } else if (viewName === 'virtual-3d') {
    tabBtnVirtual?.classList.add('active');
    cardGeneratorScreen?.classList.add('hidden');
    bottomHud?.classList.remove('hidden');
    arScannerOverlay?.classList.add('hidden');

    arScene.stopCamera();
    guidanceText.textContent = '🥂 Simulasi Kad 3D • Sentuh foto pengantin untuk melihat foto hidup & terapung seperti magnet!';
  } else if (viewName === 'table-card') {
    tabBtnCard?.classList.add('active');
    cardGeneratorScreen?.classList.remove('hidden');
    bottomHud?.classList.add('hidden');
    arScannerOverlay?.classList.add('hidden');
    arScene.stopCamera();
    cardGen.renderCard();
  }
}

// -----------------------------------------------------------------------------
// 3. Welcome Entry Modal Actions
// -----------------------------------------------------------------------------
btnStartCameraExperience?.addEventListener('click', async () => {
  await arScene.gyroManager.requestPermission();
  welcomeModal?.classList.add('hidden');
  await setView('ar-camera');
  weddingAudio.init();
});

btnStart3dExperience?.addEventListener('click', () => {
  welcomeModal?.classList.add('hidden');
  setView('virtual-3d');
  arScene.triggerMagneticSnap();
  weddingAudio.init();
});

// Quick lock button inside scanner overlay
btnSnapLock?.addEventListener('click', () => {
  if (scannerStatusText) scannerStatusText.textContent = '🧲 AR MAGNET DIKUNCI & DIAKTIFKAN! ✨';
  arScene.triggerMagneticSnap();
});

// -----------------------------------------------------------------------------
// 4. 360-Degree Controls & Position Re-center
// -----------------------------------------------------------------------------
btnToggleRotate?.addEventListener('click', () => {
  const isRotating = arScene.toggleAutoRotate();
  btnToggleRotate.classList.toggle('active', isRotating);
});

btnRecenterAnchor?.addEventListener('click', () => {
  arScene.recenterAnchor();
  guidanceText.textContent = '🎯 Hologram diletakkan semula tepat di hadapan anda!';
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
// 7. Interactive HUD Buttons
// -----------------------------------------------------------------------------
btnActivateBurst?.addEventListener('click', () => {
  arScene.triggerHologramBurst();
});

btnTakeSnapshot?.addEventListener('click', () => {
  const couple = appState.weddingInfo.couple;
  const table = appState.weddingInfo.table;
  const snapshotDataUrl = arScene.captureSnapshot(couple, table);

  snapshotPreviewImg.src = snapshotDataUrl;
  btnDownloadSnap.href = snapshotDataUrl;
  btnDownloadSnap.download = `HologramPengantin-${couple.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

  snapshotModal.classList.remove('hidden');
  weddingAudio.playHologramActivate();
});

btnCloseSnap?.addEventListener('click', () => {
  snapshotModal.classList.add('hidden');
});

btnShareSnap?.addEventListener('click', async () => {
  const dataUrl = snapshotPreviewImg.src;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'HologramPengantinAR.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Hologram AR Kad Kahwin — Walimatulurus ${appState.weddingInfo.couple}`,
        text: `Saksikan Hologram 3D pasangan pengantin ${appState.weddingInfo.couple} muncul dari kad kahwin! ✨`,
        files: [file]
      });
    } else {
      window.open(dataUrl, '_blank');
    }
  } catch (err) {
    console.warn('Share not supported or dismissed', err);
  }
});

// -----------------------------------------------------------------------------
// 8. Guest Wishing Wall Controller
// -----------------------------------------------------------------------------
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
// 9. Navigation & Mode Switch Events
// -----------------------------------------------------------------------------
tabBtnCamera?.addEventListener('click', async () => {
  await arScene.gyroManager.requestPermission();
  setView('ar-camera');
});
tabBtnVirtual?.addEventListener('click', () => setView('virtual-3d'));
tabBtnCard?.addEventListener('click', () => setView('table-card'));
btnToggleGenerator?.addEventListener('click', () => setView('table-card'));

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
// 10. Start Application
// -----------------------------------------------------------------------------
initWeddingData();
setView('virtual-3d');
