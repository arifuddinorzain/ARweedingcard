import QRCode from 'qrcode';

export class TableCardGenerator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentData = {
      coupleName: 'Arif & Fatikhah',
      tableNumber: 'Meja 07',
      tableTheme: 'Kasih Abadi',
      weddingDate: '24 Disember 2026',
      venue: 'Dewan Perdana Felda, Kuala Lumpur',
      themeColor: '#d4af37',
      photoUrl: '/pengantin.jpg'
    };
  }

  // Generates the current live WebAR URL for this specific table / wedding
  generateTableUrl(autoScan = true) {
    let origin = window.location.origin;
    // When testing locally on PC, substitute the PC's Wi-Fi network IP so mobile phone can connect
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      origin = `${window.location.protocol}//192.168.0.38:${window.location.port || '5173'}`;
    }
    const baseUrl = origin + window.location.pathname;
    const params = new URLSearchParams({
      couple: this.currentData.coupleName,
      table: this.currentData.tableNumber,
      theme: this.currentData.tableTheme,
      date: this.currentData.weddingDate,
      venue: this.currentData.venue
    });
    if (autoScan) {
      params.set('scan', '1');
    }
    return `${baseUrl}?${params.toString()}`;
  }

  // Generate QR Code as DataURL
  async getQRCodeDataUrl() {
    const url = this.generateTableUrl();
    try {
      return await QRCode.toDataURL(url, {
        width: 380,
        margin: 1,
        color: {
          dark: '#1a0c0e',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
    } catch (err) {
      console.error('Error generating QR code', err);
      return '';
    }
  }

  // Generate an offscreen HTML Canvas of the Wedding Card (Used as 3D Texture & Download)
  async generateCardCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');

    // 1. Background: Deep royal parchment with burgundy & gold accents
    const bgGrad = ctx.createLinearGradient(0, 0, 1000, 1400);
    bgGrad.addColorStop(0, '#fdfbf7');
    bgGrad.addColorStop(0.5, '#f7f1e5');
    bgGrad.addColorStop(1, '#eee2cc');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1000, 1400);

    // 2. Ornate Royal Double Gold Borders
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, 940, 1340);

    ctx.strokeStyle = 'rgba(170, 130, 10, 0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, 908, 1308);

    // Corner Ornaments
    const drawCorner = (x, y, flipX, flipY) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(flipX, flipY);
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(10, 35);
      ctx.lineTo(35, 35);
      ctx.lineTo(35, 10);
      ctx.stroke();
      ctx.restore();
    };
    drawCorner(50, 50, 1, 1);
    drawCorner(950, 50, -1, 1);
    drawCorner(50, 1350, 1, -1);
    drawCorner(950, 1350, -1, -1);

    // 3. Header Typography
    ctx.fillStyle = '#6b1d28';
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px "Playfair Display", serif';
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 500, 95);

    ctx.fillStyle = '#aa820a';
    ctx.font = 'bold 20px "Cinzel", serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('WALIMATULURUS', 500, 135);

    ctx.fillStyle = '#4a0e17';
    ctx.font = 'bold 52px "Playfair Display", serif';
    ctx.fillText(this.currentData.coupleName, 500, 200);

    ctx.fillStyle = '#aa820a';
    ctx.font = '22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`✨ ${this.currentData.tableNumber} • ${this.currentData.tableTheme} ✨`, 500, 235);

    // 4. Couple Photo (The AR Tracking Target Image)
    const photoImg = new Image();
    photoImg.crossOrigin = 'anonymous';
    photoImg.src = this.currentData.photoUrl;
    await new Promise((resolve) => {
      photoImg.onload = resolve;
      photoImg.onerror = resolve;
    });

    const photoSize = 540;
    const photoX = (1000 - photoSize) / 2;
    const photoY = 255;
    const photoW = photoSize;
    const photoH = photoSize;

    // Photo shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(photoX + 8, photoY + 8, photoW, photoH);

    // Draw Couple Photo
    if (photoImg.complete && photoImg.naturalWidth > 0) {
      ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
    } else {
      ctx.fillStyle = '#5c1923';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      ctx.fillStyle = '#f3e5ab';
      ctx.font = '32px sans-serif';
      ctx.fillText('Foto Pengantin', 500, 520);
    }

    // Photo Gold Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.strokeRect(photoX, photoY, photoW, photoH);

    // AR Target Badge on Photo
    ctx.fillStyle = 'rgba(74, 14, 23, 0.92)';
    ctx.fillRect(photoX + 70, photoY + photoH - 42, 400, 36);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(photoX + 70, photoY + photoH - 42, 400, 36);
    ctx.fillStyle = '#f3e5ab';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🧲 SASARAN KAMERA AR MAGNET 🧲', 500, photoY + photoH - 18);

    // 5. Instruction Banner
    ctx.fillStyle = '#aa820a';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('▼ IMBAS KOD QR DI BAWAH & HALAKAN KAMERA KE FOTO DI ATAS ▼', 500, 835);

    // 6. QR Code Section
    const qrDataUrl = await this.getQRCodeDataUrl();
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise(resolve => {
      qrImg.onload = resolve;
      qrImg.onerror = resolve;
    });

    const qrSize = 250;
    const qrX = (1000 - qrSize) / 2;
    const qrY = 860;

    // QR container box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

    if (qrImg.complete) {
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }

    // 7. Step-by-Step Instructions Text
    ctx.fillStyle = '#3a0810';
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('1. Imbas QR dengan telefon  •  2. Halakan kamera ke foto pengantin', 500, 1145);
    ctx.fillStyle = '#6b1d28';
    ctx.font = 'italic 18px "Playfair Display", serif';
    ctx.fillText('Saksikan Foto Pengantin Hidup & Video Kahwin Bermain Terus Di Atas Kad! ✨', 500, 1175);

    // 8. Footer Info
    ctx.fillStyle = '#aa820a';
    ctx.font = 'bold 22px "Playfair Display", serif';
    ctx.fillText(`${this.currentData.weddingDate}  •  ${this.currentData.venue}`, 500, 1235);

    ctx.fillStyle = '#8c6d12';
    ctx.font = '14px "Cinzel", serif';
    ctx.fillText('PENGALAMAN DIGITAL WEBAR HOLOGRAM • KAD JEMPUTAN RASMI', 500, 1275);

    return canvas;
  }

  // Render the interactive card preview and printable generator UI
  async renderCard() {
    if (!this.container) return;
    const qrDataUrl = await this.getQRCodeDataUrl();
    const liveUrl = this.generateTableUrl();

    this.container.innerHTML = `
      <div class="card-generator-panel">
        <div class="panel-header">
          <div class="badge-gold">👑 Penjana Kad Jemputan AR & Marker Hologram</div>
          <h2>Cipta & Cetak Kad Kahwin Hologram</h2>
          <p class="subtitle">Tetamu hanya perlu imbas Kod QR ini dengan telefon, kemudian halakan kamera ke gambar pengantin untuk menyaksikan <strong>Hologram 3D Pasangan Pengantin</strong> muncul terapung bersama ucapan Selamat Pengantin Baharu!</p>
        </div>

        <div class="card-generator-grid">
          <!-- Form Controls -->
          <div class="generator-controls glass-card">
            <h3>✨ Maklumat Majlis & Pasangan</h3>
            
            <div class="form-group">
              <label>Nama Pasangan Pengantin</label>
              <input type="text" id="cfg-couple" value="${this.currentData.coupleName}" placeholder="contoh: Arif & Fatikhah" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Nombor Meja</label>
                <input type="text" id="cfg-table" value="${this.currentData.tableNumber}" placeholder="contoh: Meja 07" />
              </div>
              <div class="form-group">
                <label>Tema Meja</label>
                <input type="text" id="cfg-theme" value="${this.currentData.tableTheme}" placeholder="contoh: Kasih Abadi" />
              </div>
            </div>

            <div class="form-group">
              <label>Tarikh Majlis</label>
              <input type="text" id="cfg-date" value="${this.currentData.weddingDate}" placeholder="contoh: 24 Disember 2026" />
            </div>

            <div class="form-group">
              <label>Lokasi / Dewan</label>
              <input type="text" id="cfg-venue" value="${this.currentData.venue}" placeholder="contoh: Dewan Perdana Felda, Kuala Lumpur" />
            </div>

            <!-- Action Buttons Stack -->
            <div class="action-buttons-stack">
              <button id="btn-print-card" class="btn-primary-gold">
                🖨️ Cetak Kad Jemputan (Print)
              </button>
              <button id="btn-download-card-png" class="btn-gold-outline">
                📥 Muat Turun Kad (PNG Berdefinisi Tinggi)
              </button>
              <button id="btn-open-ar-view" class="btn-secondary-emerald">
                📸 Buka Pengimbas Kamera AR Sekarang
              </button>
            </div>

            <div class="qr-share-box">
              <span class="url-label">Pautan Terus Pengimbas WebAR:</span>
              <div class="share-input-row">
                <input type="text" readonly value="${liveUrl}" class="url-input" id="cfg-share-url" />
                <button class="btn-copy" id="btn-copy-url">Salin</button>
              </div>
            </div>
          </div>

          <!-- Printable Card Visual Preview -->
          <div class="tent-card-preview-wrapper">
            <div class="tent-card" id="printable-tent-card">
              <!-- Top Banner -->
              <div class="card-inner-frame">
                <div class="card-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                <div class="card-title-sub">WALIMATULURUS</div>
                <h1 class="card-couple-name">${this.currentData.coupleName}</h1>
                <div class="card-divider-ornament">❖ ────── 👑 ────── ❖</div>

                <div class="card-table-badge">
                  <span class="badge-num">${this.currentData.tableNumber}</span>
                  <span class="badge-sub">${this.currentData.tableTheme}</span>
                </div>

                <!-- Couple Photo Display (AR Marker) -->
                <div class="card-photo-container">
                  <div class="photo-frame-wrapper">
                    <img src="${this.currentData.photoUrl}" alt="Pengantin Arif & Fatikhah" class="card-couple-img" id="preview-couple-img" />
                    <div class="marker-target-badge">
                      <span class="pulse-dot"></span>
                      <span>🧲 SASARAN KAMERA AR MAGNET</span>
                    </div>
                  </div>
                </div>

                <!-- QR Section -->
                <div class="card-qr-container">
                  <div class="qr-frame">
                    <img src="${qrDataUrl}" alt="QR Code WebAR Hologram" class="qr-image" id="preview-qr-img" />
                  </div>
                  <div class="qr-instruction">
                    <div class="qr-step">📱 <strong>1. Imbas Kod QR Ini</strong></div>
                    <div class="qr-desc">Buka laman WebAR di telefon pintar anda.</div>
                    <div class="qr-step" style="margin-top: 6px;">📸 <strong>2. Halakan Kamera ke Foto Pengantin Di Atas</strong></div>
                    <div class="qr-desc">Saksikan <strong>Hologram 3D Pasangan Pengantin</strong> muncul terapung bersama ucapan Selamat Pengantin Baharu! ✨</div>
                  </div>
                </div>

                <!-- Footer details -->
                <div class="card-footer-info">
                  <p class="card-date">${this.currentData.weddingDate}</p>
                  <p class="card-venue">${this.currentData.venue}</p>
                  <div class="card-ar-tag">✨ KAD JEMPUTAN RASMI BERTEKNOLOGI AR HOLOGRAM ✨</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const coupleInput = document.getElementById('cfg-couple');
    const tableInput = document.getElementById('cfg-table');
    const themeInput = document.getElementById('cfg-theme');
    const dateInput = document.getElementById('cfg-date');
    const venueInput = document.getElementById('cfg-venue');
    const printBtn = document.getElementById('btn-print-card');
    const downloadPngBtn = document.getElementById('btn-download-card-png');
    const openArBtn = document.getElementById('btn-open-ar-view');
    const copyBtn = document.getElementById('btn-copy-url');

    const updatePreview = async () => {
      this.currentData.coupleName = coupleInput.value || 'Arif & Fatikhah';
      this.currentData.tableNumber = tableInput.value || 'Meja 07';
      this.currentData.tableTheme = themeInput.value || 'Kasih Abadi';
      this.currentData.weddingDate = dateInput.value || '24 Disember 2026';
      this.currentData.venue = venueInput.value || 'Dewan Perdana Felda';

      const qrUrl = await this.getQRCodeDataUrl();
      const qrImg = document.getElementById('preview-qr-img');
      if (qrImg) qrImg.src = qrUrl;

      const shareUrlInput = document.getElementById('cfg-share-url');
      if (shareUrlInput) shareUrlInput.value = this.generateTableUrl();

      // Update card text
      const nameElem = document.querySelector('.card-couple-name');
      if (nameElem) nameElem.textContent = this.currentData.coupleName;

      const numElem = document.querySelector('.badge-num');
      if (numElem) numElem.textContent = this.currentData.tableNumber;

      const themeElem = document.querySelector('.badge-sub');
      if (themeElem) themeElem.textContent = this.currentData.tableTheme;

      const dateElem = document.querySelector('.card-date');
      if (dateElem) dateElem.textContent = this.currentData.weddingDate;

      const venueElem = document.querySelector('.card-venue');
      if (venueElem) venueElem.textContent = this.currentData.venue;
    };

    [coupleInput, tableInput, themeInput, dateInput, venueInput].forEach(inp => {
      inp?.addEventListener('input', updatePreview);
    });

    printBtn?.addEventListener('click', () => {
      window.print();
    });

    downloadPngBtn?.addEventListener('click', async () => {
      downloadPngBtn.textContent = '⏳ Menjana Kad PNG...';
      const canvas = await this.generateCardCanvas();
      const link = document.createElement('a');
      link.download = `KadKahwin-Hologram-${this.currentData.coupleName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      downloadPngBtn.textContent = '📥 Muat Turun Kad (PNG Berdefinisi Tinggi)';
    });

    openArBtn?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('switch-to-ar', { detail: this.currentData }));
    });

    copyBtn?.addEventListener('click', () => {
      const shareUrlInput = document.getElementById('cfg-share-url');
      if (shareUrlInput) {
        navigator.clipboard.writeText(shareUrlInput.value);
        copyBtn.textContent = 'Disalin! ✓';
        setTimeout(() => {
          copyBtn.textContent = 'Salin';
        }, 2000);
      }
    });
  }

  // Parse current URL query params (if opened via scanned QR code)
  static parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      couple: params.get('couple') || 'Arif & Fatikhah',
      table: params.get('table') || 'Meja 07',
      theme: params.get('theme') || 'Kasih Abadi',
      date: params.get('date') || '24 Disember 2026',
      venue: params.get('venue') || 'Dewan Perdana Felda, Kuala Lumpur',
      photoUrl: '/pengantin.jpg',
      autoScan: params.get('scan') === '1' || params.has('scan') || params.has('ar')
    };
  }
}
