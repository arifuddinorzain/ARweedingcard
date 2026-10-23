/**
 * LivingPhotoEngine
 * Turns static couple photo into a cinematic living moving picture
 * with Ken Burns breathing motion, sunbeam sweeps, sparkling songket,
 * and optional custom video playback - just like Stories AR!
 */
export class LivingPhotoEngine {
  constructor(canvasId = 'living-photo-canvas') {
    this.canvas = document.getElementById(canvasId) || document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.ctx = this.canvas.getContext('2d');

    this.img = new Image();
    this.img.crossOrigin = 'anonymous';
    this.img.src = '/pengantin.jpg';
    this.isImgLoaded = false;
    this.img.onload = () => {
      this.isImgLoaded = true;
    };

    this.customVideo = null;
    this.isPlaying = false;
    this.animId = null;
    this.startTime = performance.now();

    // Star sparkle particles on songket
    this.sparkles = [];
    for (let i = 0; i < 28; i++) {
      this.sparkles.push({
        x: 0.25 + Math.random() * 0.5,
        y: 0.35 + Math.random() * 0.55,
        size: 2 + Math.random() * 5,
        speed: 1.5 + Math.random() * 2.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Floating romantic rose petals
    this.petals = [];
    for (let i = 0; i < 16; i++) {
      this.petals.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        r: 3 + Math.random() * 4,
        speedY: 0.6 + Math.random() * 1.2,
        speedX: Math.sin(Math.random() * 5) * 0.4,
        rot: Math.random() * Math.PI,
        rotSpeed: 0.02 + Math.random() * 0.03,
        alpha: 0.4 + Math.random() * 0.5
      });
    }
  }

  setCustomVideo(videoElement) {
    this.customVideo = videoElement;
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isPlaying = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  loop(now) {
    if (!this.isPlaying) return;
    const elapsed = (now - this.startTime) / 1000;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. If custom video is playing, draw video frame
    if (this.customVideo && !this.customVideo.paused && this.customVideo.readyState >= 2) {
      ctx.drawImage(this.customVideo, 0, 0, w, h);
    } else if (this.isImgLoaded) {
      // 2. Cinematic Ken Burns Living Motion ("Gambar Bergerak"):
      // Breathing slow zoom loop: 1.00 to 1.07
      const zoom = 1.035 + Math.sin(elapsed * 0.8) * 0.035;
      // Gentle cinematic slow sway: -8px to +8px
      const panX = Math.sin(elapsed * 0.45) * 12;
      const panY = Math.cos(elapsed * 0.55) * 7;

      const drawW = w * zoom;
      const drawH = h * zoom;
      const drawX = (w - drawW) / 2 + panX;
      const drawY = (h - drawH) / 2 + panY;

      ctx.save();
      ctx.drawImage(this.img, drawX, drawY, drawW, drawH);

      // 3. Diagonal Sunbeam / Light Flare Sweep (like romantic wedding videography)
      // Sweeps across the mosque & couple every 3.2 seconds
      const sweepProgress = (elapsed % 3.2) / 3.2;
      const sweepCenter = sweepProgress * (w + h) - h * 0.4;

      const flareGrad = ctx.createLinearGradient(
        sweepCenter - 140, 0,
        sweepCenter + 140, h
      );
      flareGrad.addColorStop(0, 'rgba(255, 235, 180, 0)');
      flareGrad.addColorStop(0.4, 'rgba(255, 245, 210, 0.22)');
      flareGrad.addColorStop(0.5, 'rgba(255, 255, 240, 0.42)');
      flareGrad.addColorStop(0.6, 'rgba(255, 245, 210, 0.22)');
      flareGrad.addColorStop(1, 'rgba(255, 235, 180, 0)');

      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, 0, w, h);

      // 4. Sparkling Diamond Glints on Songket Embroidery
      for (const sp of this.sparkles) {
        const sx = sp.x * w + Math.sin(elapsed * 0.5 + sp.phase) * 6;
        const sy = sp.y * h;
        const shimmer = Math.pow(Math.sin(elapsed * sp.speed + sp.phase), 8);

        if (shimmer > 0.08) {
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(elapsed * 1.5 + sp.phase);
          ctx.fillStyle = `rgba(255, 255, 255, ${shimmer * 0.95})`;
          this.drawStar(ctx, 0, 0, 4, sp.size * (1 + shimmer), sp.size * 0.3);
          ctx.fill();

          // Subtle gold halo
          ctx.beginPath();
          ctx.arc(0, 0, sp.size * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(254, 240, 138, ${shimmer * 0.4})`;
          ctx.fill();
          ctx.restore();
        }
      }

      // 5. Floating Romantic Golden Petals / Stardust
      for (const p of this.petals) {
        p.y -= p.speedY;
        p.x += Math.sin(elapsed + p.rot) * 0.5;
        p.rot += p.rotSpeed;

        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgba(255, 215, 0, ${p.alpha * (0.6 + Math.sin(elapsed * 2 + p.rot) * 0.4)})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r * 1.4, p.r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Subtle Vignette & Royal Gold Border
      const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.65);
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(20, 8, 12, 0.45)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();
    }

    this.animId = requestAnimationFrame(this.loop);
  }

  // Generate Floating 3D Greeting Banner Texture
  static createBannerCanvas(text = 'SELAMAT PENGANTIN BAHARU', arabic = 'بَارَكَ اللَّهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا') {
    const c = document.createElement('canvas');
    c.width = 900;
    c.height = 200;
    const ctx = c.getContext('2d');

    // Royal Burgundy Pill
    ctx.fillStyle = 'rgba(74, 14, 23, 0.94)';
    ctx.beginPath();
    ctx.roundRect(20, 15, 860, 170, 45);
    ctx.fill();

    // Gold Double Stroke
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(20, 15, 860, 170, 45);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(28, 23, 844, 154, 38);
    ctx.stroke();

    // Arabic Calligraphy
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px "Playfair Display", serif';
    ctx.fillText(arabic, 450, 75);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Cinzel", "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`✨ ${text} ✨`, 450, 142);

    return c;
  }

  // Generate Floating Names Plaque Texture
  static createNamesCanvas(names = 'Arif & Haziqah', info = 'Walimatulurus • Kasih Abadi') {
    const c = document.createElement('canvas');
    c.width = 750;
    c.height = 160;
    const ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(20, 10, 710, 140, 35);
    ctx.fill();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(20, 10, 710, 140, 35);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 40px "Playfair Display", serif';
    ctx.fillText(names, 375, 70);

    ctx.fillStyle = '#d4af37';
    ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(info, 375, 115);

    return c;
  }
}
