import { WeddingARScene } from './arScene.js';
import { TableCardGenerator } from './qrGenerator.js';
import { WishingWall } from './wishingWall.js';
import { weddingAudio } from './audio.js';

// Application State
const appState = {
  currentView: 'ar-camera', // 'ar-camera', 'virtual-3d', 'table-card'
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
  const { couple, table } = appState.weddingInfo;
  if (headerCoupleName) headerCoupleName.textContent = couple;
  if (badgeTableText) badgeTableText.textContent = table;
  if (inputWishTable) inputWishTable.value = table;
}

// -----------------------------------------------------------------------------
// 2. View Mode Controller (Camera AR vs Virtual Banquet 3D vs Printable Card)
// -----------------------------------------------------------------------------
async function setView(viewName) {
  appState.currentView = viewName;

  // Update tabs visual state
  [tabBtnCamera, tabBtnVirtual, tabBtnCard].forEach(btn => btn?.classList.remove('active'));

  if (viewName === 'ar-camera') {
    tabBtnCamera?.classList.add('active');
    cardGeneratorScreen?.classList.add('hidden');
    bottomHud?.classList.remove('hidden');

    const success = await arScene.startCamera();
    if (success) {
      guidanceText.textContent = 'Halakan kamera ke meja anda • Sentuh skrin untuk mekar & lepaskan rama-rama';
    } else {
      // Fallback message if camera access denied
      guidanceText.textContent = 'Mod Simulasi Meja 3D Aktif (Kamera tidak dapat diakses)';
      arScene.virtualTable.visible = true;
    }
  } else if (viewName === 'virtual-3d') {
    tabBtnVirtual?.classList.add('active');
    cardGeneratorScreen?.classList.add('hidden');
    bottomHud?.classList.remove('hidden');

    arScene.stopCamera();
    arScene.virtualTable.visible = true;
    guidanceText.textContent = 'Mod Simulasi Meja Perkahwinan 3D • Seret untuk putar sudut pandangan';
  } else if (viewName === 'table-card') {
    tabBtnCard?.classList.add('active');
    cardGeneratorScreen?.classList.remove('hidden');
    bottomHud?.classList.add('hidden');
    cardGen.renderCard();
  }
}

// -----------------------------------------------------------------------------
// 3. Audio & Music Controller
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

// Auto-trigger pleasant harp notes on first user interaction
window.addEventListener('pointerdown', () => {
  weddingAudio.init();
}, { once: true });

// -----------------------------------------------------------------------------
// 4. Filter Chips (All, Flowers, Rings, Butterflies)
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
// 5. Interactive HUD Buttons
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

// Web Share API support for sharing snapshot
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
      // Fallback
      window.open(dataUrl, '_blank');
    }
  } catch (err) {
    console.warn('Share not supported or dismissed', err);
  }
});

// -----------------------------------------------------------------------------
// 6. Guest Wishing Wall Controller
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

// Preset Chips Auto-fill
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

  // Close modal after celebration
  setTimeout(() => {
    wishingModal.classList.add('hidden');
  }, 1200);
});

// Close modals when clicking backdrop
[wishingModal, snapshotModal].forEach(modal => {
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
});

// -----------------------------------------------------------------------------
// 7. Navigation & Mode Switch Events
// -----------------------------------------------------------------------------
tabBtnCamera?.addEventListener('click', () => setView('ar-camera'));
tabBtnVirtual?.addEventListener('click', () => setView('virtual-3d'));
tabBtnCard?.addEventListener('click', () => setView('table-card'));
btnToggleGenerator?.addEventListener('click', () => setView('table-card'));

// Custom event from Card Generator to switch back to AR
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
// 8. Start Application
// -----------------------------------------------------------------------------
initWeddingData();
// Start in Virtual 3D mode so table, flowers, rings, and butterflies are instantly visible!
setView('virtual-3d');
