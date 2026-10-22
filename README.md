# 💍 Magic Table AR — Meja Ajaib Perkahwinan

> **"Satu QR, Satu Pengalaman"**  
> Tetamu mengimbas kod QR di atas meja jamuan mereka dan menyaksikan bunga digital mekar, rama-rama 3D berterbangan, dan cincin perkahwinan berlian terapung bercahaya di skrin telefon seolah-olah berada di atas meja sebenar.

---

## ✨ Ciri-Ciri Utama (Key Features)

1. **📸 Mod Kamera AR Sebenar (Live WebAR Table Experience)**
   - Menggunakan suapan kamera belakang telefon pintar (*WebRTC environment facing*).
   - Pengesanan dan penempatan di atas meja dengan panduan retikel emas.
   - Tetamu boleh memutar (*drag*), mengezum (*pinch scale*), dan menyentuh skrin untuk melepaskan rama-rama.

2. **🥂 Mod Simulasi Meja Banquet 3D (3D Table Simulation Mode)**
   - Paparan meja bulat jamuan mewah lengkap dengan kain alas *emerald silk*, rim emas, pemegang lilin terapung berkerlipan, dan dulang alas cermin.
   - Sesuai untuk paparan di komputer riba / sekiranya tetamu menutup kebenaran kamera.

3. **🌸 Bunga Ros & Peony Mekar Digital (Procedural 3D Blooming Flowers)**
   - Kelopak bunga 3D berlapis yang mekar secara organik daripada kudup menjadi bunga kembang mekar berseri.
   - Dilengkapi pusaran kelopak mawar berguguran (*falling petals vortex*) dan debu emas bercahaya.

4. **💍 Cincin Perkahwinan Kembar 3D (Floating Interlinked Diamond Rings)**
   - Gandingan cincin emas *Champagne Gold* dan cincin *Platinum* bertatahkan batu permata berlian bersinar dengan pantulan biasan cahaya (*diamond sparkle glint*).
   - Terapung dan berputar perlahan di atas jambangan bunga.

5. **🦋 Rama-Rama 3D Berterbangan (Animated 3D Butterflies)**
   - Sayap beranimasi lembut (*sinusoidal flapping physics*) dengan laluan terbang 3D di sekeliling meja.
   - Warna *Morpho Blue*, *Golden Monarch*, dan *Amber Sunset* dengan kesan jejak cahaya magis (*stardust trail*).

6. **💌 Buku Tetamu & Ucapan Digital (Interactive Guestbook & Wishing Wall)**
   - Tetamu boleh menaip ucapan dan doa restu untuk raja sehari.
   - Butang pilihan pantas seperti *"Barakallahu lakuma ✨"*, *"Semoga kekal hingga ke Jannah 🤍"*.
   - Hantaran ucapan disambut dengan pancuran konfeti emas & merah jambu (*canvas-confetti*) serta bunyi loceng restu.

7. **📸 Tangkap Gambar Kenangan AR (AR Polaroid Photo Snapshot)**
   - Menggabungkan suapan kamera langsung + model 3D bunga, cincin, dan rama-rama + bingkai emas elegan *"Walimatulurus Arif & Haziqah"*.
   - Butang muat turun segera untuk disimpan atau dikongsi terus ke Instagram Story / WhatsApp.

8. **🖨️ Penjana Kad Meja & Kod QR Boleh Cetak (Table Tent Card Generator)**
   - Tuan rumah / pengantin boleh mengubah nama pasangan, nombor meja (contoh: *Meja 07 - Kasih Abadi*), tarikh, dan lokasi.
   - Kod QR dijana secara dinamik dan dipaparkan pada kad meja berformat lipatan (*folding tent card*).
   - Tekan butang **"Cetak Kad Meja"** untuk mencetak terus pada kertas kad tebal!

9. **🎵 Muzik Romantik & Kesan Audio (Web Audio API Synthesizer)**
   - Melodi arpeggio kecapi romantis (irama *Canon in D*) dijana secara terus tanpa fail mp3 luaran.
   - Kesan audio magis semasa bunga mekar, kilauan cincin, dan kepakan sayap rama-rama.

---

## 🚀 Cara Menjalankan Projek

### 1. Pasang Kebergantungan (Dependencies)
```bash
npm install
```

### 2. Jalankan Dev Server
```bash
npm run dev -- --host
```

Aplikasi sedia dibuka di:
- **Pelayar Komputer:** `http://localhost:5173/`
- **Telefon Pintar (Wi-Fi sama):** Buka alamat IP rangkaian tempatan anda (contoh: `http://192.168.0.38:5173/`).

> **Nota untuk Penggunaan Kamera Telefon Pintar:**  
> Pelayar telefon (Chrome / Safari) memerlukan sambungan selamat (HTTPS atau localhost) untuk mengakses kamera. Untuk menguji kamera telefon dari jauh, anda boleh menggunakan alat seperti **ngrok** atau **localtunnel**:
> ```bash
> npx localtunnel --port 5173
> ```
> Buka URL HTTPS yang diberikan pada telefon anda untuk pengalaman kamera penuh!

### 3. Membina Fail Siap untuk Pelancaran (Production Build)
```bash
npm run build
```
Fail siap akan dijana di dalam folder `dist/` dan boleh dihoskan di mana-mana platform seperti GitHub Pages, Vercel, Netlify, atau Cloudflare Pages.

---

## 🎨 Struktur Fail Projek

```
ARkadkawin/
├── index.html            # Struktur HTML WebAR, navigasi diraja, HUD & modal
├── package.json          # Konfigurasi projek & kebergantungan (Vite, Three.js, QRCode, Confetti)
├── src/
│   ├── main.js           # Pengawal utama aplikasi & penyelarasan mod
│   ├── arScene.js        # Enjin 3D Three.js (Bunga mekar, cincin berlian, rama-rama, retikel)
│   ├── qrGenerator.js    # Penjana kod QR & susun atur kad meja boleh cetak
│   ├── wishingWall.js    # Pengurus buku ucapan tetamu digital & konfeti
│   ├── audio.js          # Pengsintesis audio Web Audio API (muzik latar & efek bunyi)
│   └── style.css         # Reka bentuk estetik mewah perkahwinan (Emerald, Champagne Gold, Glassmorphism)
└── README.md             # Dokumentasi projek
```
