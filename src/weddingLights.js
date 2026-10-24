/**
 * WeddingLightsEngine
 * Romantic, luxurious wedding light effects for WebAR & Digital Wedding Cards.
 * Features:
 * - Warm golden & champagne fairy light bokeh orbs with glowing radial bloom
 * - Sparkling 4-point and 6-point diamond star flares that shimmer and rotate
 * - Floating golden stardust embers with gentle sinusoidal upward drift
 * - Radiant wedding sunbeam / aura expansion
 * Replaces harsh party confetti with elegant, cinematic wedding lights!
 */
export class WeddingLightsEngine {
  constructor(canvasId = 'wedding-lights-canvas') {
    this.canvasId = canvasId;
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      this.canvas.className = 'wedding-lights-overlay';
      document.body.appendChild(this.canvas);
    }
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.particles = [];
    this.lightBeams = [];
    this.animId = null;
    this.isRunning = false;

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);

    this.initCanvas();
    window.addEventListener('resize', this.resize);
  }

  initCanvas() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '999';
  }

  resize() {
    this.initCanvas();
  }

  /**
   * Trigger a burst of warm wedding lights
   * @param {Object} options
   * @param {Object} options.origin - { x: 0..1, y: 0..1 }
   * @param {number} options.count - Number of light particles (default: 65)
   * @param {string} options.preset - 'gold' | 'rose' | 'champagne'
   */
  burst(options = {}) {
    const origin = options.origin || { x: 0.5, y: 0.55 };
    const count = options.count || 65;
    const cx = origin.x * this.width;
    const cy = origin.y * this.height;

    // Palette of luxury wedding lights: warm champagne, royal gold, soft candle flame, diamond white
    const lightColors = [
      { r: 255, g: 248, b: 220, hex: '#fff8dc' }, // champagne white
      { r: 254, g: 240, b: 138, hex: '#fef08a' }, // warm fairy light
      { r: 255, g: 215, b: 0,   hex: '#ffd700' }, // pure royal gold
      { r: 255, g: 193, b: 7,   hex: '#ffc107' }, // warm amber glow
      { r: 255, g: 235, b: 175, hex: '#ffebaf' }, // soft candle glow
      { r: 255, g: 255, b: 255, hex: '#ffffff' }  // diamond starlight
    ];

    // 1. Radiant Central Light Aura Bloom (Divine wedding blessing aura)
    this.lightBeams.push({
      x: cx,
      y: cy,
      radius: 20,
      maxRadius: Math.min(this.width, this.height) * 0.45,
      alpha: 0.65,
      decay: 0.016,
      color: '254, 240, 138'
    });

    // 2. Spawn Wedding Fairy Lights & Bokeh Orbs
    for (let i = 0; i < count; i++) {
      const color = lightColors[Math.floor(Math.random() * lightColors.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 4.8;
      const type = Math.random();

      if (type < 0.45) {
        // A. Warm Bokeh Fairy Light Orb
        this.particles.push({
          type: 'bokeh',
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed * 0.7,
          vy: Math.sin(angle) * speed * 0.7 - (1.2 + Math.random() * 1.8), // float upwards
          radius: 6 + Math.random() * 16,
          alpha: 0.8 + Math.random() * 0.2,
          decay: 0.007 + Math.random() * 0.009,
          pulseSpeed: 3 + Math.random() * 4,
          pulsePhase: Math.random() * Math.PI * 2,
          swaySpeed: 1.5 + Math.random() * 2,
          swayAmp: 0.6 + Math.random() * 1.2,
          color
        });
      } else if (type < 0.80) {
        // B. Sparkling 4-point Diamond Star Twinkle
        this.particles.push({
          type: 'star',
          x: cx + (Math.random() - 0.5) * 80,
          y: cy + (Math.random() - 0.5) * 80,
          vx: Math.cos(angle) * speed * 0.9,
          vy: Math.sin(angle) * speed * 0.9 - (0.8 + Math.random() * 1.5),
          size: 8 + Math.random() * 14,
          rotation: Math.random() * Math.PI,
          rotSpeed: (Math.random() - 0.5) * 0.08,
          alpha: 0.95,
          decay: 0.010 + Math.random() * 0.012,
          shimmerSpeed: 5 + Math.random() * 6,
          color
        });
      } else {
        // C. Romantic Golden Stardust Ember
        this.particles.push({
          type: 'stardust',
          x: cx + (Math.random() - 0.5) * 60,
          y: cy + (Math.random() - 0.5) * 60,
          vx: Math.cos(angle) * speed * 1.1,
          vy: Math.sin(angle) * speed * 1.1 - (1.5 + Math.random() * 2.2),
          radius: 2 + Math.random() * 3.5,
          alpha: 1.0,
          decay: 0.008 + Math.random() * 0.010,
          swaySpeed: 2 + Math.random() * 3,
          swayAmp: 0.8 + Math.random() * 1.5,
          color
        });
      }
    }

    if (!this.isRunning) {
      this.isRunning = true;
      this.startTime = performance.now();
      requestAnimationFrame(this.loop);
    }
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
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
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const elapsed = (now - this.startTime) / 1000;

    // 1. Render expanding light beam auras
    for (let i = this.lightBeams.length - 1; i >= 0; i--) {
      const beam = this.lightBeams[i];
      beam.radius += (beam.maxRadius - beam.radius) * 0.06;
      beam.alpha -= beam.decay;

      if (beam.alpha <= 0) {
        this.lightBeams.splice(i, 1);
        continue;
      }

      const grad = ctx.createRadialGradient(beam.x, beam.y, 0, beam.x, beam.y, beam.radius);
      grad.addColorStop(0, `rgba(${beam.color}, ${beam.alpha * 0.95})`);
      grad.addColorStop(0.35, `rgba(${beam.color}, ${beam.alpha * 0.45})`);
      grad.addColorStop(0.7, `rgba(255, 215, 0, ${beam.alpha * 0.15})`);
      grad.addColorStop(1, 'rgba(255, 215, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(beam.x, beam.y, beam.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Render fairy lights, bokeh orbs & diamond stars
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // Physics: smooth floating drift with air resistance
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx + Math.sin(elapsed * p.swaySpeed || 2) * (p.swayAmp || 0.5);
      p.y += p.vy;

      const c = p.color;

      if (p.type === 'bokeh') {
        // Warm glowing fairy light orb with multi-layer radial bloom
        const pulse = 1 + Math.sin(elapsed * p.pulseSpeed + p.pulsePhase) * 0.18;
        const currentR = p.radius * pulse;

        // Outer soft glow halo
        const haloGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentR * 2.2);
        haloGrad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${p.alpha * 0.85})`);
        haloGrad.addColorStop(0.35, `rgba(${c.r}, ${c.g}, ${c.b}, ${p.alpha * 0.35})`);
        haloGrad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentR * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Bright luminous filament center
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.95})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentR * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'star') {
        // 4-point Diamond Star Flare (Twinkling star shine)
        p.rotation += p.rotSpeed;
        const shimmer = Math.abs(Math.sin(elapsed * p.shimmerSpeed));
        const currentSize = p.size * (0.8 + shimmer * 0.4);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // Soft star aura
        const starHalo = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize * 1.8);
        starHalo.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${p.alpha * 0.6})`);
        starHalo.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
        ctx.fillStyle = starHalo;
        ctx.beginPath();
        ctx.arc(0, 0, currentSize * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 4-point sharp diamond star
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.95})`;
        this.drawStar(ctx, 0, 0, 4, currentSize, currentSize * 0.22);
        ctx.fill();

        ctx.restore();
      } else if (p.type === 'stardust') {
        // Floating Golden Stardust
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${p.alpha * 0.95})`);
        grad.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${c.b}, ${p.alpha * 0.4})`);
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.particles.length > 0 || this.lightBeams.length > 0) {
      this.animId = requestAnimationFrame(this.loop);
    } else {
      this.isRunning = false;
      this.animId = null;
      ctx.clearRect(0, 0, w, h);
    }
  }
}

// Global Singleton Instance
export const weddingLights = new WeddingLightsEngine();
