import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

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
    const params = new URLSearchParams();

    // Set couple name
    if (this.currentData.coupleName) {
      params.set('couple', this.currentData.coupleName);
    }
    // Only add additional parameters if customized beyond defaults (keeps QR code matrix clean & dots large)
    if (this.currentData.tableNumber && this.currentData.tableNumber !== 'Meja 07') {
      params.set('table', this.currentData.tableNumber);
    }
    if (this.currentData.tableTheme && this.currentData.tableTheme !== 'Kasih Abadi') {
      params.set('theme', this.currentData.tableTheme);
    }
    if (this.currentData.weddingDate && this.currentData.weddingDate !== '24 Disember 2026') {
      params.set('date', this.currentData.weddingDate);
    }
    if (this.currentData.venue && this.currentData.venue !== 'Dewan Perdana Felda, Kuala Lumpur') {
      params.set('venue', this.currentData.venue);
    }
    if (autoScan) {
      params.set('scan', '1');
    }
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  // Generate QR Code as DataURL with optimal phone camera detection parameters
  async getQRCodeDataUrl() {
    const url = this.generateTableUrl();
    try {
      return await QRCode.toDataURL(url, {
        width: 480,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (err) {
      console.error('Error generating QR code', err);
      return '';
    }
  }

  // Helper to draw rounded rectangle on Canvas
  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // Generate an offscreen HTML Canvas of the Wedding Card (Used as 3D Texture & A4 PDF Download)
  async generateCardCanvas() {
    const canvas = document.createElement('canvas');
    // Calibrated to standard A4 portrait ratio (1 : 1.414)
    canvas.width = 1000;
    canvas.height = 1414;
    const ctx = canvas.getContext('2d');

    // 1. Background: Load authentic royal floral wedding card template
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = '/floral-card-bg.jpg';
    await new Promise((resolve) => {
      bgImg.onload = resolve;
      bgImg.onerror = resolve;
    });

    if (bgImg.complete && bgImg.naturalWidth > 0) {
      ctx.drawImage(bgImg, 0, 0, 1000, 1414);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 1000, 1414);
      bgGrad.addColorStop(0, '#fdfbf7');
      bgGrad.addColorStop(0.5, '#f7f1e5');
      bgGrad.addColorStop(1, '#eee2cc');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1000, 1414);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 10;
      ctx.strokeRect(30, 30, 940, 1354);
    }

    // 2. Header Typography
    ctx.fillStyle = '#6b1d28';
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px "Playfair Display", serif';
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 500, 120);

    ctx.fillStyle = '#aa820a';
    ctx.font = 'bold 18px "Cinzel", serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('WALIMATULURUS', 500, 160);

    ctx.fillStyle = '#4a0e17';
    ctx.font = 'bold 48px "Playfair Display", serif';
    ctx.fillText(this.currentData.coupleName, 500, 220);

    ctx.fillStyle = '#8c6d12';
    ctx.font = '20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`✨ ${this.currentData.tableNumber} • ${this.currentData.tableTheme} ✨`, 500, 255);

    // 3. Couple Photo (The AR Tracking Target Image - 100% CLEAN, NO OVERLAY BADGE)
    const photoImg = new Image();
    photoImg.crossOrigin = 'anonymous';
    photoImg.src = this.currentData.photoUrl;
    await new Promise((resolve) => {
      photoImg.onload = resolve;
      photoImg.onerror = resolve;
    });

    const photoW = 560;
    const photoH = 315; // Exact 16:9 widescreen ratio (560 / 315 = 1.777778 = 16:9)
    const photoX = (1000 - photoW) / 2;
    const photoY = 275;

    // Photo shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(photoX + 8, photoY + 8, photoW, photoH);

    // Draw Couple Photo (Clean 16:9 Target)
    if (photoImg.complete && photoImg.naturalWidth > 0) {
      ctx.drawImage(photoImg, photoX, photoY, photoW, photoH);
    } else {
      ctx.fillStyle = '#5c1923';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      ctx.fillStyle = '#f3e5ab';
      ctx.font = '32px sans-serif';
      ctx.fillText('Foto Pengantin', 500, 430);
    }

    // Photo Gold Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.strokeRect(photoX, photoY, photoW, photoH);

    // 4. Instruction Banner (Pill badge)
    const bannerW = 720;
    const bannerH = 40;
    const bannerX = (1000 - bannerW) / 2;
    const bannerY = 612;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 252, 246, 0.94)';
    ctx.shadowColor = 'rgba(60, 10, 15, 0.12)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    this.drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 20);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.8;
    this.drawRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 20);
    ctx.stroke();

    ctx.fillStyle = '#8c6d12';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('▼ IMBAS KOD QR DI BAWAH & HALAKAN KAMERA KE FOTO DI ATAS ▼', 500, bannerY + 25, 660);

    // 5. QR Code Section
    const qrDataUrl = await this.getQRCodeDataUrl();
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise(resolve => {
      qrImg.onload = resolve;
      qrImg.onerror = resolve;
    });

    const qrSize = 230;
    const qrX = (1000 - qrSize) / 2;
    const qrY = 675;

    // QR container box with shadow & gold border
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(60, 10, 15, 0.16)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    this.drawRoundedRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3.5;
    this.drawRoundedRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16);
    ctx.stroke();

    if (qrImg.complete) {
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }

    // 6. Step-by-Step Instructions & Event Details Plaque
    // (Solid Ivory Parchment Plaque that completely protects text from overlapping floral background)
    const plaqueW = 700;
    const plaqueH = 340;
    const plaqueX = (1000 - plaqueW) / 2;
    const plaqueY = 945;

    ctx.save();
    ctx.shadowColor = 'rgba(40, 5, 10, 0.22)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(255, 253, 248, 0.96)';
    this.drawRoundedRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 22);
    ctx.fill();
    ctx.restore();

    // Outer Gold Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3.5;
    this.drawRoundedRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 22);
    ctx.stroke();

    // Inner Hairline Inset Gold Border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, plaqueX + 6, plaqueY + 6, plaqueW - 12, plaqueH - 12, 16);
    ctx.stroke();

    // Text inside the Plaque - 100% High Contrast & Contained Within Safe Borders
    // Step 1
    ctx.fillStyle = '#3a0810';
    ctx.font = 'bold 17.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('1. Imbas Kod QR di atas menggunakan kamera telefon', 500, plaqueY + 40, 620);

    // Step 2
    ctx.fillStyle = '#3a0810';
    ctx.font = 'bold 17.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('2. Halakan kamera terus ke Foto Pengantin di atas', 500, plaqueY + 70, 620);

    // Reward Highlight (Split into 2 beautiful, safe-width lines to prevent any border overflow)
    ctx.fillStyle = '#881337';
    ctx.font = 'bold 16px "Playfair Display", serif';
    ctx.fillText('✨ Saksikan Foto Pengantin Hidup & Bernyawa ✨', 500, plaqueY + 104, 600);

    ctx.fillStyle = '#6b1d28';
    ctx.font = 'italic 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Video majlis kahwin & alunan lagu terus bermain di atas kad anda!', 500, plaqueY + 130, 600);

    // Decorative Filigree Divider (Compact, elegant)
    ctx.fillStyle = '#d4af37';
    ctx.font = '14px "Playfair Display", serif';
    ctx.fillText('❖ ────────── ❖', 500, plaqueY + 158, 300);

    // Wedding Date
    ctx.fillStyle = '#4a0e17';
    ctx.font = 'bold 22px "Playfair Display", serif';
    ctx.fillText(this.currentData.weddingDate, 500, plaqueY + 194, 600);

    // Venue
    ctx.fillStyle = '#5c1825';
    ctx.font = 'bold 17.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(this.currentData.venue, 500, plaqueY + 228, 600);

    // Tagline
    ctx.fillStyle = '#aa820a';
    ctx.font = 'bold 12px "Cinzel", serif';
    ctx.fillText('PENGALAMAN DIGITAL WEBAR HOLOGRAM • KAD JEMPUTAN RASMI', 500, plaqueY + 270, 620);

    return canvas;
  }

  // Export & Download standard A4 Portrait PDF (210mm x 297mm)
  async downloadCardPDF() {
    const canvas = await this.generateCardCanvas();
    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    // Standard A4 dimensions in mm: 210 x 297
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    const slug = (this.currentData.coupleName || 'Arif-Fatikhah').replace(/[^a-zA-Z0-9]/g, '_');
    pdf.save(`Kad-Kahwin-${slug}-A4-Potret.pdf`);
  }

  // Print as calibrated single-page A4 portrait
  async printCardA4() {
    const canvas = await this.generateCardCanvas();
    let printEl = document.getElementById('a4-printable-card');
    if (!printEl) {
      printEl = document.createElement('div');
      printEl.id = 'a4-printable-card';
      document.body.appendChild(printEl);
    }
    printEl.innerHTML = `<img src="${canvas.toDataURL('image/jpeg', 0.96)}" alt="Kad Kahwin A4 Potret" />`;
    window.print();
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
              <button id="btn-download-pdf-generator" class="btn-primary-burgundy" style="background: linear-gradient(135deg, #701a2b 0%, #9f1239 100%); color: white; padding: 14px 20px; font-weight: 700; border-radius: 9999px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 6px 18px rgba(112, 26, 43, 0.35);">
                📄 Muat Turun Kad PDF (A4 Potret)
              </button>
              <button id="btn-print-card" class="btn-primary-gold">
                🖨️ Cetak Kad Jemputan (A4 Print)
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

                <!-- Couple Photo Display (Clean - No Badge) -->
                <div class="card-photo-container">
                  <div class="photo-frame-wrapper">
                    <img src="${this.currentData.photoUrl}" alt="Pengantin Arif & Fatikhah" class="card-couple-img" id="preview-couple-img" />
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

    const downloadPdfBtn = document.getElementById('btn-download-pdf-generator');
    downloadPdfBtn?.addEventListener('click', async () => {
      downloadPdfBtn.textContent = '⏳ Menjana PDF A4...';
      try {
        await this.downloadCardPDF();
      } finally {
        downloadPdfBtn.textContent = '📄 Muat Turun Kad PDF (A4 Potret)';
      }
    });

    printBtn?.addEventListener('click', async () => {
      await this.printCardA4();
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

  static sanitizeCoupleName(name) {
    if (!name) return 'Arif & Fatikhah';
    let cleaned = name;
    try {
      cleaned = decodeURIComponent(cleaned);
      if (cleaned.includes('%')) {
        cleaned = decodeURIComponent(cleaned);
      }
    } catch (e) {}
    cleaned = cleaned.replace(/%26/g, '&').replace(/%20/g, ' ').replace(/\+/g, ' ');
    cleaned = cleaned.replace(/haziqah/gi, 'Fatikhah');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.toLowerCase() === 'arif &' || cleaned.toLowerCase() === 'arif') {
      return 'Arif & Fatikhah';
    }
    return cleaned;
  }

  // Parse current URL query params (if opened via scanned QR code)
  static parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const rawCouple = params.get('couple');
    return {
      couple: TableCardGenerator.sanitizeCoupleName(rawCouple),
      table: params.get('table') || 'Meja 07',
      theme: params.get('theme') || 'Kasih Abadi',
      date: params.get('date') || '24 Disember 2026',
      venue: params.get('venue') || 'Dewan Perdana Felda, Kuala Lumpur',
      photoUrl: '/pengantin.jpg',
      autoScan: params.get('scan') === '1' || params.has('scan') || params.has('ar')
    };
  }
}
