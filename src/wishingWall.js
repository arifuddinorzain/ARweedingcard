import confetti from 'canvas-confetti';
import { weddingAudio } from './audio.js';

export class WishingWall {
  constructor() {
    this.storageKey = 'magic_table_wedding_wishes';
    this.wishes = this.loadWishes();
  }

  loadWishes() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    // Default heartwarming wishes
    return [
      {
        id: 1,
        name: 'Datin Seri Zaleha & Keluarga',
        table: 'Meja 01',
        message: 'Barakallahu lakuma wa baraka alaikuma wa jama’a bainakuma fi khair. Tahniah Arif & Haziqah! Semoga berkekalan ke anak cucu.',
        time: 'Tadi'
      },
      {
        id: 2,
        name: 'Farhan & Rakan Universiti',
        table: 'Meja 05',
        message: 'Selamat Pengantin Baru bro! Cantik sangat meja AR ni bila scan. Semoga mahligai yang dibina sentiasa dipenuhi mawaddah dan rahmah.',
        time: '5 minit lalu'
      },
      {
        id: 3,
        name: 'Mak Ngah & Pak Ngah',
        table: 'Meja 03',
        message: 'Alhamdulillah selesai akad nikah yang penuh barakah. Selamat melayari bahtera perkahwinan berdua.',
        time: '12 minit lalu'
      }
    ];
  }

  saveWishes() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.wishes));
  }

  addWish(name, table, message) {
    const newWish = {
      id: Date.now(),
      name: name.trim() || 'Tetamu Meja',
      table: table.trim() || 'Meja',
      message: message.trim(),
      time: 'Baru sahaja'
    };

    this.wishes.unshift(newWish);
    this.saveWishes();

    // Trigger celebration effects
    weddingAudio.playWishSent();
    this.triggerConfetti();

    return newWish;
  }

  triggerConfetti() {
    // Elegant gold and rose petal confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#d4af37', '#f3e5ab', '#ff6b8b', '#ffffff', '#e84a5f']
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#d4af37', '#f3e5ab', '#ff6b8b']
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#d4af37', '#f3e5ab', '#ff6b8b']
      });
    }, 250);
  }

  renderWishesList() {
    return this.wishes.map(w => `
      <div class="wish-item glass-card">
        <div class="wish-header">
          <div class="wish-author">
            <span class="wish-avatar">💌</span>
            <strong>${w.name}</strong>
          </div>
          <span class="wish-badge">${w.table}</span>
        </div>
        <p class="wish-text">"${w.message}"</p>
        <span class="wish-time">${w.time}</span>
      </div>
    `).join('');
  }
}
