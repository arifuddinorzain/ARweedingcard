import QRCode from 'qrcode';

export class TableCardGenerator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentData = {
      coupleName: 'Arif & Haziqah',
      tableNumber: 'Meja 07',
      tableTheme: 'Kasih Abadi',
      weddingDate: '24 Disember 2026',
      venue: 'Dewan Perdana Felda, Kuala Lumpur',
      themeColor: '#d4af37'
    };
  }

  // Generates the current live WebAR URL for this specific table
  generateTableUrl() {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      couple: this.currentData.coupleName,
      table: this.currentData.tableNumber,
      theme: this.currentData.tableTheme,
      date: this.currentData.weddingDate,
      venue: this.currentData.venue
    });
    return `${baseUrl}?${params.toString()}`;
  }

  // Generate QR Code as DataURL
  async getQRCodeDataUrl() {
    const url = this.generateTableUrl();
    try {
      return await QRCode.toDataURL(url, {
        width: 320,
        margin: 1,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
    } catch (err) {
      console.error('Error generating QR code', err);
      return '';
    }
  }

  // Render the interactive card preview and printable generator UI
  async renderCard() {
    if (!this.container) return;
    const qrDataUrl = await this.getQRCodeDataUrl();
    const liveUrl = this.generateTableUrl();

    this.container.innerHTML = `
      <div class="card-generator-panel">
        <div class="panel-header">
          <div class="badge-gold">👑 Penjana Kad Meja & QR Tetamu</div>
          <h2>Cipta & Cetak Kad Meja "Magic Table"</h2>
          <p class="subtitle">Tetapkan butiran majlis anda. Tetamu hanya perlu imbas QR ini dari meja mereka untuk melihat Bunga 3D, Cincin & Rama-rama di atas meja!</p>
        </div>

        <div class="card-generator-grid">
          <!-- Form Inputs -->
          <div class="generator-controls glass-card">
            <h3>✨ Maklumat Meja & Pengantin</h3>
            
            <div class="form-group">
              <label>Nama Pasangan Pengantin</label>
              <input type="text" id="cfg-couple" value="${this.currentData.coupleName}" placeholder="contoh: Arif & Haziqah" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Nombor Meja</label>
                <input type="text" id="cfg-table" value="${this.currentData.tableNumber}" placeholder="contoh: Meja 07" />
              </div>
              <div class="form-group">
                <label>Nama Tema Meja</label>
                <input type="text" id="cfg-theme" value="${this.currentData.tableTheme}" placeholder="contoh: Kasih Abadi" />
              </div>
            </div>

            <div class="form-group">
              <label>Tarikh Majlis</label>
              <input type="text" id="cfg-date" value="${this.currentData.weddingDate}" placeholder="contoh: 24 Disember 2026" />
            </div>

            <div class="form-group">
              <label>Lokasi / Dewan</label>
              <input type="text" id="cfg-venue" value="${this.currentData.venue}" placeholder="contoh: Dewan Perdana Felda" />
            </div>

            <div class="action-buttons-stack">
              <button id="btn-print-card" class="btn-primary-gold">
                🖨️ Cetak Kad Meja (Print Tent Card)
              </button>
              <button id="btn-open-ar-view" class="btn-secondary-emerald">
                📱 Uji Pengalaman AR Meja Ini
              </button>
            </div>

            <div class="qr-share-box">
              <span class="url-label">Pautan Terus QR:</span>
              <input type="text" readonly value="${liveUrl}" class="url-input" id="cfg-share-url" />
              <button class="btn-copy" id="btn-copy-url">Salin</button>
            </div>
          </div>

          <!-- Printable Card Visual Preview -->
          <div class="tent-card-preview-wrapper">
            <div class="tent-card" id="printable-tent-card">
              <!-- Fold Top Mark -->
              <div class="card-fold-indicator">✂️ GARIS LIPATAN KAD MEJA (FOLD LINE) ✂️</div>

              <!-- Top Decorative Border -->
              <div class="card-inner-frame">
                <div class="card-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                <div class="card-title-sub">WALIMATULURUS</div>
                <h1 class="card-couple-name">${this.currentData.coupleName}</h1>
                <div class="card-divider-ornament">❖ ────── 💍 ────── ❖</div>

                <div class="card-table-badge">
                  <span class="badge-num">${this.currentData.tableNumber}</span>
                  <span class="badge-sub">${this.currentData.tableTheme}</span>
                </div>

                <!-- QR Section -->
                <div class="card-qr-container">
                  <div class="qr-frame">
                    <img src="${qrDataUrl}" alt="QR Code Magic Table" class="qr-image" id="preview-qr-img" />
                  </div>
                  <div class="qr-instruction">
                    <div class="qr-step">📸 <strong>Imbas Menggunakan Kamera Telefon</strong></div>
                    <div class="qr-desc">Saksikan Bunga Mekar, Cincin Emas & Rama-rama 3D muncul di atas meja ini!</div>
                  </div>
                </div>

                <!-- Footer details -->
                <div class="card-footer-info">
                  <p class="card-date">${this.currentData.weddingDate}</p>
                  <p class="card-venue">${this.currentData.venue}</p>
                  <div class="card-ar-tag">✨ PENGALAMAN DIGITAL MAGIC TABLE AR ✨</div>
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
    const openArBtn = document.getElementById('btn-open-ar-view');
    const copyBtn = document.getElementById('btn-copy-url');

    const updatePreview = async () => {
      this.currentData.coupleName = coupleInput.value || 'Arif & Haziqah';
      this.currentData.tableNumber = tableInput.value || 'Meja 07';
      this.currentData.tableTheme = themeInput.value || 'Kasih Abadi';
      this.currentData.weddingDate = dateInput.value || '24 Disember 2026';
      this.currentData.venue = venueInput.value || 'Dewan Perdana Felda';

      const qrUrl = await this.getQRCodeDataUrl();
      const qrImg = document.getElementById('preview-qr-img');
      if (qrImg) qrImg.src = qrUrl;

      const shareUrlInput = document.getElementById('cfg-share-url');
      if (shareUrlInput) shareUrlInput.value = this.generateTableUrl();

      // Update preview card text
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

    openArBtn?.addEventListener('click', () => {
      // Dispatch custom event to switch to AR view
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
      couple: params.get('couple') || 'Arif & Haziqah',
      table: params.get('table') || 'Meja 07',
      theme: params.get('theme') || 'Kasih Abadi',
      date: params.get('date') || '24 Disember 2026',
      venue: params.get('venue') || 'Dewan Perdana Felda'
    };
  }
}
