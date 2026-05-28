import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, GRAVITY } from '../config/constants.js';
import { defaultBindings } from '../config/keys.js';
import { InputManager } from '../systems/InputManager.js';
import { Player } from '../entities/Player.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.physics.world.gravity.y = GRAVITY;

    this.createGround();
    this.createWalls();

    this.inputManager = new InputManager(this, defaultBindings);

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT - 100);

    this.physics.add.collider(this.player.sprite, this.groundGroup);
    this.physics.add.collider(this.player.sprite, this.wallGroup);

    this.createTestHazard();

    const worldWidth = GAME_WIDTH * 3;
    this.physics.world.setBounds(0, 0, worldWidth, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, worldWidth, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(80, 40);
  }

  createGround() {
    this.groundGroup = this.physics.add.staticGroup();
    const worldWidth = GAME_WIDTH * 3;

    // Suelo base
    for (let x = 0; x < worldWidth; x += 32) {
      const tile = this.add.rectangle(x + 16, GAME_HEIGHT - 16, 32, 32, 0x8b6914);
      this.groundGroup.add(tile);
      tile.body.updateFromGameObject();
    }

    // Plataforma elevada
    for (let x = GAME_WIDTH; x < GAME_WIDTH + 128; x += 32) {
      const tile = this.add.rectangle(x + 16, GAME_HEIGHT - 96, 32, 32, 0x8b6914);
      this.groundGroup.add(tile);
      tile.body.updateFromGameObject();
    }
  }

  createWalls() {
    this.wallGroup = this.physics.add.staticGroup();
    const wallBaseY = GAME_HEIGHT - 16;

    const wallPositions = [200, 400];
    for (const wallX of wallPositions) {
      for (let y = 0; y < 8; y++) {
        const tile = this.add.rectangle(wallX + 16, wallBaseY - 32 * y, 32, 32, 0x555555);
        this.wallGroup.add(tile);
        tile.body.updateFromGameObject();
      }
    }
  }

  update(time, delta) {
    this.player.update(delta, this.inputManager);
  }

  createTestHazard() {
    const hx = 700;
    const hy = GAME_HEIGHT - 44;
    const hazard = this.add.rectangle(hx, hy, 48, 24, 0xff2222);
    this.physics.add.existing(hazard, true);
    hazard.body.updateFromGameObject();
    this.physics.add.overlap(this.player.sprite, hazard, (_player, hazardObj) => {
      this.player.takeDamage(1, hazardObj.x);
    });
  }
}
