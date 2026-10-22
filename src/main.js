import { WeddingARScene } from './arScene.js';
import { TableCardGenerator } from './qrGenerator.js';
import { WishingWall } from './wishingWall.js';
import { weddingAudio } from './audio.js';

// Application State
const appState = {
  currentView: 'virtual-3d', // 'ar-camera', 'virtual-3d', 'table-card'
  filterMode: 'all',        // 'all', 'flowers', 'rings', 'butterflies'
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

// 360 Rotation Controls
const btnToggleRotate = document.getElementById('btn-toggle-rotate');

// Welcome Entry Modal
const welcomeModal = document.getElementById('welcome-modal');
const welcomeCoupleName = document.getElementById('welcome-couple-name');
const welcomeTableInfo = document.getElementById('welcome-table-info');
const btnStartCameraExperience = document.getElementById('btn-start-camera-experience');
const btnStart3dExperience = document.getElementById('btn-start-3d-experience');

const cardGeneratorScreen = document.getElementById('card-generator-screen');
const btnRebloom = document.getElementById('btn-rebloom');
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
}

// -----------------------------------------------------------------------------
// 2. View Mode Controller (Camera AR vs Virtual Banquet 3D vs Printable Card)
// -----------------------------------------------------------------------------
async function setView(viewName) {
  appState.currentView = viewName;

  [tabBtnCamera, tabBtnVirtual, tabBtnCard].forEach(btn => btn?.classList.remove('active'));

  if (viewName === 'ar-camera') {
    tabBtnCamera?.classList.add('active');
    cardGeneratorScreen?.classList.add('hidden');
    bottomHud?.classList.remove('hidden');

    const success = await arScene.startCamera();
    if (success) {
      guidanceText.textContent = '✨ Cincin sentiasa tetap di atas meja • Sentuh skrin pada meja untuk alih kedudukan • Pusing telefon 360°!';
    } else {
      guidanceText.textContent = 'Mod Simulasi Meja 3D (Kamera tidak dapat diakses) • Seret 360° untuk putar!';
      arScene.virtualTable.visible = true;
    }
  } else if (viewName === 'virtual-3d') {
    tabBtnVirtual?.classList.add('active');
    cardGeneratorScreen?.classList.add('hidden');
    bottomHud?.classList.remove('hidden');

    arScene.stopCamera();
    arScene.virtualTable.visible = true;
    guidanceText.textContent = '🥂 Meja Jamuan 3D • Seret untuk putar 360°, cubit untuk zum cincin!';
  } else if (viewName === 'table-card') {
    tabBtnCard?.classList.add('active');
    cardGeneratorScreen?.classList.remove('hidden');
    bottomHud?.classList.add('hidden');
    cardGen.renderCard();
  }
}

const btnRecenterAnchor = document.getElementById('btn-recenter-anchor');

// -----------------------------------------------------------------------------
// 3. Welcome Entry Modal Actions
// -----------------------------------------------------------------------------
btnStartCameraExperience?.addEventListener('click', async () => {
  // Request iOS Gyroscope permission directly within user touch event!
  await arScene.gyroManager.requestPermission();
  welcomeModal?.classList.add('hidden');
  await setView('ar-camera');
  arScene.playOpeningAnimation();
  weddingAudio.init();
});

btnStart3dExperience?.addEventListener('click', () => {
  welcomeModal?.classList.add('hidden');
  setView('virtual-3d');
  arScene.playOpeningAnimation();
  weddingAudio.init();
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
  guidanceText.textContent = '🎯 Cincin diletakkan semula tepat di atas meja di hadapan anda!';
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
// 6. Filter Chips (All, Flowers, Rings, Butterflies)
// -----------------------------------------------------------------------------
document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    e.currentTarget.classList.add('active');

    const mode = e.currentTarget.getAttribute('data-mode');
    arScene.setMode(mode);

    if (mode === 'rings') {
      weddingAudio.playRingShimmer();
    } else if (mode === 'butterflies') {
      weddingAudio.playButterflyFlutter();
    } else {
      weddingAudio.playBloomSfx();
    }
  });
});

// -----------------------------------------------------------------------------
// 7. Interactive HUD Buttons
// -----------------------------------------------------------------------------
btnRebloom?.addEventListener('click', () => {
  arScene.triggerBloom();
});

btnTakeSnapshot?.addEventListener('click', () => {
  const couple = appState.weddingInfo.couple;
  const table = appState.weddingInfo.table;
  const snapshotDataUrl = arScene.captureSnapshot(couple, table);

  snapshotPreviewImg.src = snapshotDataUrl;
  btnDownloadSnap.href = snapshotDataUrl;
  btnDownloadSnap.download = `MagicTable-${couple.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

  snapshotModal.classList.remove('hidden');
  weddingAudio.playBloomSfx();
});

btnCloseSnap?.addEventListener('click', () => {
  snapshotModal.classList.add('hidden');
});

btnShareSnap?.addEventListener('click', async () => {
  const dataUrl = snapshotPreviewImg.src;
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'MagicTableAR.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `Magic Table AR — Walimatulurus ${appState.weddingInfo.couple}`,
        text: `Saksikan keajaiban AR di meja perkahwinan ${appState.weddingInfo.couple}! ✨`,
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
