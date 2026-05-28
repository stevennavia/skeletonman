import Phaser from 'phaser';
import { KEY, defaultBindings } from '../config/keys.js';

export class InputManager {
  constructor(scene, bindings = defaultBindings) {
    this.scene = scene;
    this.bindings = bindings;
    this._keys = {};

    for (const keyNames of Object.values(bindings)) {
      for (const name of keyNames) {
        if (this._keys[name]) continue;
        const keyCode = Phaser.Input.Keyboard.KeyCodes[name];
        if (keyCode !== undefined) {
          this._keys[name] = scene.input.keyboard.addKey(keyCode);
        }
      }
    }
  }

  isDown(action) {
    const keyNames = this.bindings[action];
    if (!keyNames) return false;
    for (const name of keyNames) {
      const key = this._keys[name];
      if (key && key.isDown) return true;
    }
    return false;
  }

  justDown(action) {
    const keyNames = this.bindings[action];
    if (!keyNames) return false;
    for (const name of keyNames) {
      const key = this._keys[name];
      if (key && Phaser.Input.Keyboard.JustDown(key)) return true;
    }
    return false;
  }

  axisX() {
    let v = 0;
    if (this.isDown(KEY.LEFT)) v -= 1;
    if (this.isDown(KEY.RIGHT)) v += 1;
    return v;
  }

  axisY() {
    let v = 0;
    if (this.isDown(KEY.UP)) v -= 1;
    if (this.isDown(KEY.DOWN)) v += 1;
    return v;
  }
}
