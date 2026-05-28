import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const barWidth = 200;
    const barHeight = 12;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2;

    const bg = this.add.rectangle(GAME_WIDTH / 2, barY, barWidth, barHeight, 0x333333);
    const fill = this.add.rectangle(barX + 2, barY, 0, barHeight - 4, 0x00ffcc).setOrigin(0, 0.5);

    this.load.on('progress', (value) => {
      fill.width = (barWidth - 4) * value;
    });

    this.load.on('complete', () => {
      bg.destroy();
      fill.destroy();
    });
  }

  create() {
    this.generatePlaceholderTextures();
    this.scene.start('GameScene');
  }

  generatePlaceholderTextures() {
    const g = this.make.graphics({ add: false });

    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 32, 48);
    g.generateTexture('player', 32, 48);
    g.clear();
  }
}
