# 👑 Hologram AR Kad Kahwin — Imbas Kad & Foto Pengantin

> **"Satu Kad, Sejuta Keajaiban"**  
> Tetamu menerima kad kahwin fizikal dengan gambar pengantin dan kod QR. Tetamu mengimbas kod QR untuk membuka pengimbas WebAR, kemudian menghalakan kamera telefon ke **gambar pasangan pengantin** pada kad. Seketika itu juga, gambar pasangan muncul terapung dalam bentuk **Hologram 3D bercahaya** dengan ucapan **"Selamat Pengantin Baharu"** dan alunan suara restu!

---

## ✨ Ciri-Ciri Utama (Key Features)

1. **📸 Pengimbas Kamera AR (Live Camera Card Scanner)**
   - Menggunakan suapan kamera belakang telefon pintar (*WebRTC environment facing*).
   - Dilengkapi *viewfinder* pengimbas pintar dengan pancaran garis laser animasi emas (*scanning laser beam*) dan penanda sasaran kad.
   - Apabila kamera dihalakan ke gambar pengantin pada kad, sistem mengaktifkan portal hologram 3D secara automatik.

2. **✨ Hologram 3D Pasangan Pengantin (Floating 3D Hologram)**
   - Menggunakan foto sebenar pasangan pengantin berbusana songket diraja di hadapan masjid putih megah.
   - Diberikan kesan khas hologram: garisan imbasan mendatar (*scanlines*), kilauan biasan cahaya (*chromatic shimmer*), rim cahaya (*fresnel glow*), dan ayunan terapung lembut (*levitation hover*).
   - Dihiasi gerbang kubah emas diraja 3D berilhamkan seni bina masjid, tiang cahaya volumetrik, dan lingkaran geometri berputar (*cyber-rune rings*).

3. **🕊️ Ucapan 3D & Ucapan Suara (3D Floating Greetings & Voice Blessing)**
   - Kaligrafi terapung: *"بَارَكَ اللَّهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا"*
   - Sepanduk 3D melengkung bersinar: *"✨ SELAMAT PENGANTIN BAHARU ✨"*
   - Nama pasangan: *"Arif & Haziqah — 24 Disember 2026"*
   - Ucapan suara automatik / butang suara pengantin: *"Selamat Pengantin Baharu kepada Arif & Haziqah. Terima kasih atas doa dan kehadiran anda!"*

4. **🥂 Mod Simulasi Kad 3D (Virtual 3D Card Simulation)**
   - Meja jamuan diraja 3D dengan kad jemputan terletak di atas meja bersama foto pengantin dan kod QR.
   - Hologram 3D memancar keluar dari kad dan boleh diputar 360°, dizum, dan diuji terus pada komputer atau telefon tanpa memerlukan cetakan awal.

5. **🖨️ Penjana Kad Jemputan & Marker QR Boleh Cetak**
   - Menghasilkan kad jemputan rasmi yang memaparkan:
     - Foto pasangan pengantin (*Target Marker AR*)
     - Kod QR pintar yang terus menghubungkan ke laman WebAR
     - Butiran majlis (nama pasangan, tarikh, dewan/lokasi, nombor meja)
     - Panduan langkah demi langkah untuk tetamu
   - Butang **"Cetak Kad Jemputan"** dan **"Muat Turun Kad (PNG Berdefinisi Tinggi)"**.

6. **🎨 3 Tema Warna Hologram**
   - 👑 **Emas Diraja (Royal Gold)**: Sinar keemasan mewah champagne.
   - 💎 **Kristal Maya (Cyber Cyan)**: Kesan hologram kristal berteknologi tinggi.
   - 🌹 **Delima Songket (Ruby Burgundy)**: Sesuai dengan warna busana songket pengantin.

7. **📸 Tangkap Gambar Kenangan AR (AR Polaroid Photo Snapshot)**
   - Menggabungkan suapan kamera langsung + Hologram 3D + bingkai emas eksklusif *"Walimatulurus Arif & Haziqah"*.
   - Muat turun foto terus ke galeri telefon atau kongsi ke WhatsApp / Instagram Story.

8. **💌 Buku Tetamu & Ucapan Digital (Wishing Wall)**
   - Tetamu boleh menaip ucapan dan doa restu yang disimpan secara langsung.
   - Dilengkapi letupan konfeti emas dan loceng keraian.

---

## 🚀 Cara Menjalankan Projek

### 1. Jalankan Dev Server
```bash
npm run dev -- --host
```

Aplikasi sedia dibuka di:
- **Pelayar Komputer:** `http://localhost:5173/`
- **Telefon Pintar (Wi-Fi sama):** Buka alamat IP rangkaian tempatan anda (contoh: `http://192.168.0.38:5173/`).

### 2. Membina Fail Siap untuk Pelancaran (Production Build)
```bash
npm run build
```
Fail siap berada di folder `dist/` dan sedia untuk dideploy ke Netlify, Vercel, atau GitHub Pages.

---

## 📂 Fail Utama

- `public/pengantin.jpg` & `src/assets/pengantin.jpg` : Foto pasangan pengantin berbusana songket diraja.
- `src/arScene.js` : Enjin 3D Three.js yang membina portal hologram, pancaran cahaya, paparan hologram pengantin, teks 3D terapung, dan zarah cahaya.
- `src/qrGenerator.js` : Penjana kad jemputan boleh cetak lengkap dengan foto sasaran dan kod QR.
- `src/audio.js` : Pengsintesis muzik romantik dan suara ucapan Selamat Pengantin Baharu.
- `src/main.js` : Pengawal utama, pengimbas kamera, penukaran tema, dan interaksi pengguna.
- `src/style.css` : Reka bentuk estetik mewah perkahwinan bertema Songket Burgundy & Champagne Gold.
