import { StateMachine } from '../lib/StateMachine.js';
import { KEY } from '../config/keys.js';
import {
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPRITE_WIDTH, PLAYER_SPRITE_HEIGHT,
  PLAYER_SPEED, PLAYER_ACCELERATION,
  JUMP_VELOCITY, JUMP_HOLD_FORCE, JUMP_CUT_VELOCITY,
  COYOTE_TIME_MS, JUMP_BUFFER_MS,
  WALL_SLIDE_SPEED,
  WALL_JUMP_VELOCITY_X, WALL_JUMP_VELOCITY_Y,
  WALL_JUMP_LOCK_TIME_MS, WALL_RELEASE_TIME_MS, WALL_COYOTE_TIME_MS,
  DOUBLE_JUMP_VELOCITY,
  DASH_SPEED, DASH_SPEED_AIR, DASH_DURATION_MS, DASH_COOLDOWN,
  SLASH_STARTUP, SLASH_ACTIVE, SLASH_RECOVERY,
  SLASH_WIDTH, SLASH_HEIGHT, SLASH_OFFSET_X,
  INVULN_DURATION, PLAYER_MAX_HP, RESPAWN_DELAY,
} from '../config/constants.js';
import { DIR } from '../lib/utils.js';

/* ================================================================
   Player Controller
   =================================================================
   Arquitectura: StateMachine (FSM) con métodos de estado nombrados.
   Estados: idle, run, jump, fall, wallSlide, wallJump, doubleJump,
            dash, slash, hurt, dead
   ================================================================= */

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.facing = DIR.RIGHT;
    this.hp = PLAYER_MAX_HP;

    // ---- timers (ms) ----
    this._coyoteTimer = 0;
    this._jumpBufferTimer = 0;
    this._dashCooldownTimer = 0;
    this._dashTimer = 0;
    this._wallReleaseTimer = 0;
    this._wallJumpLockTimer = 0;
    this._wallCoyoteTimer = 0;
    this._invulnTimer = 0;
    this._respTimer = 0;

    // ---- flags ----
    this._hasDoubleJump = true;
    this._wasGrounded = false;
    this._lastWallDir = null;   // dirección de la última pared tocada

    // ---- hitboxes ----
    this._slashHitbox = null;

    // ---- sprite ----
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setDisplaySize(PLAYER_SPRITE_WIDTH, PLAYER_SPRITE_HEIGHT);
    this.sprite.setTint(0x00ccff);
    this.sprite.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT);
    this.sprite.body.setOffset(
      (PLAYER_SPRITE_WIDTH - PLAYER_WIDTH) / 2,
      PLAYER_SPRITE_HEIGHT - PLAYER_HEIGHT
    );
    this.sprite.setCollideWorldBounds(true);

    // ---- state machine ----
    this.fsm = new StateMachine(this, 'idle');
    this._setupStates();
  }

  /* ================================================================
     FSM Configuration
     ================================================================= */

  _setupStates() {
    this.fsm
      .addState('idle', {
        enter: () => this._enterIdle(),
        update: (delta, input) => this._updateIdle(delta, input),
      })
      .addState('run', {
        enter: () => this._enterRun(),
        update: (delta, input) => this._updateRun(delta, input),
      })
      .addState('jump', {
        enter: () => this._enterJump(),
        update: (delta, input) => this._updateJump(delta, input),
      })
      .addState('fall', {
        enter: () => this._enterFall(),
        update: (delta, input) => this._updateFall(delta, input),
      })
      .addState('wallSlide', {
        enter: () => this._enterWallSlide(),
        update: (delta, input) => this._updateWallSlide(delta, input),
      })
      .addState('wallJump', {
        enter: (awayDir) => this._enterWallJump(awayDir),
        update: (delta, input) => this._updateWallJump(delta, input),
      })
      .addState('doubleJump', {
        enter: () => this._enterDoubleJump(),
        update: (delta, input) => this._updateDoubleJump(delta, input),
      })
      .addState('dash', {
        blockReEnter: true,
        enter: () => this._enterDash(),
        update: (delta, input) => this._updateDash(delta, input),
      })
      .addState('slash', {
        blockReEnter: true,
        enter: () => this._enterSlash(),
        update: (delta, input) => this._updateSlash(delta, input),
      })
      .addState('hurt', {
        blockReEnter: true,
        enter: () => this._enterHurt(),
        update: (delta, input) => this._updateHurt(delta, input),
      })
      .addState('dead', {
        blockReEnter: true,
        enter: () => this._enterDead(),
        update: (delta, input) => this._updateDead(delta, input),
      });
  }

  /* ================================================================
     State Enter Methods
     ================================================================= */

  _enterIdle() {
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 1000);
    this.sprite.body.setAccelerationX(0);
    this.sprite.body.setDragX(PLAYER_ACCELERATION);
  }

  _enterRun() {
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 1000);
    this.sprite.body.setDragX(0);
  }

  _enterJump() {
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 1000);
    this.sprite.body.setVelocityY(JUMP_VELOCITY);
    this.sprite.body.setDragX(PLAYER_ACCELERATION);
    this._dashCooldownTimer = 0;
  }

  _enterFall() {
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 1000);
    this.sprite.body.setDragX(PLAYER_ACCELERATION);
  }

  _enterWallSlide() {
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 1000);
    // Solo detenemos la velocidad horizontal; la gravedad actúa naturalmente
    this.sprite.body.setVelocityX(0);
    this.sprite.body.setAccelerationX(0);
    this.sprite.body.setDragX(0);
  }

  _enterWallJump(awayDir) {
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 1000);
    // Pequeño empuje horizontal para separarse de la pared, pero el jugador
    // controla la dirección desde el frame 1 con A/D.
    this.sprite.body.setVelocity(
      awayDir * WALL_JUMP_VELOCITY_X,
      WALL_JUMP_VELOCITY_Y
    );
    this.sprite.body.setDragX(PLAYER_ACCELERATION);
    this._wallJumpLockTimer = WALL_JUMP_LOCK_TIME_MS;
    this._wallReleaseTimer = WALL_RELEASE_TIME_MS;
    this._resetAirAbilities();
    this._consumeJumpBuffer();
  }

  _enterDoubleJump() {
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 1000);
    this.sprite.body.setVelocityY(DOUBLE_JUMP_VELOCITY);
    this.sprite.body.setDragX(PLAYER_ACCELERATION);
    this._consumeJumpBuffer();
  }

  _enterDash() {
    this.sprite.body.setMaxVelocity(2000, 1000);
    const baseSpeed = this._isGrounded() ? DASH_SPEED : DASH_SPEED_AIR;
    const momentum = Math.abs(this.sprite.body.velocity.x);
    const speed = baseSpeed + momentum;
    this.sprite.body.setVelocityY(0);
    this.sprite.body.setVelocityX(speed * this.facing);
    this.sprite.body.setAccelerationX(0);
    this.sprite.body.setDragX(0);
    this._dashCooldownTimer = DASH_COOLDOWN;
    this._dashTimer = DASH_DURATION_MS;
  }

  _enterSlash() {
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 1000);
    this.sprite.body.setVelocityX(0);
    this.sprite.body.setAccelerationX(0);
    this.sprite.body.setDragX(PLAYER_ACCELERATION);
  }

  _enterHurt() {
    this._destroySlashHitbox();
    this.sprite.body.setMaxVelocity(PLAYER_SPEED, 1000);
    const knockDir = this.sprite.x < this._damageSourceX ? DIR.LEFT : DIR.RIGHT;
    this.sprite.body.setVelocityX(knockDir * 150);
    this.sprite.body.setVelocityY(-120);
    this.sprite.body.setAccelerationX(0);
    this.sprite.body.setDragX(PLAYER_ACCELERATION);
    this._invulnTimer = INVULN_DURATION;
    this.sprite.setTint(0xff4444);
  }

  _enterDead() {
    this._destroySlashHitbox();
    this.sprite.body.setVelocity(0, 0);
    this.sprite.body.setAcceleration(0);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setTint(0xff0000);
    this.sprite.setAlpha(0.6);
    this._respTimer = RESPAWN_DELAY;
  }

  /* ================================================================
     State Update Methods
     ================================================================= */

  _updateIdle(delta, input) {
    if (this._checkDash(input)) return;
    if (this._checkSlash(input)) return;

    const ax = input.axisX();
    if (ax !== 0) {
      this.fsm.setState('run');
      return;
    }

    if (this._wantsJump() && this._isGrounded()) {
      this._consumeJumpBuffer();
      this.fsm.setState('jump');
    }
  }

  _updateRun(delta, input) {
    if (this._checkDash(input)) return;
    if (this._checkSlash(input)) return;

    const ax = input.axisX();
    if (ax === 0) {
      this.fsm.setState('idle');
      return;
    }
    this.facing = ax > 0 ? DIR.RIGHT : DIR.LEFT;
    this.sprite.setFlipX(this.facing === DIR.LEFT);
    this.sprite.body.setAccelerationX(
      ax > 0 ? PLAYER_ACCELERATION : -PLAYER_ACCELERATION
    );

    if (this._wantsJump() && this._isGrounded()) {
      this._consumeJumpBuffer();
      this.fsm.setState('jump');
    }
  }

  _updateJump(delta, input) {
    if (this._checkCommonAirTransitions(input)) return;

    this._handleAirControl(input);
    this._applyVariableJump(delta, input);

    if (this._wantsJump() && this._hasDoubleJump) {
      this._hasDoubleJump = false;
      this._consumeJumpBuffer();
      this.fsm.setState('doubleJump');
      return;
    }

    if (this.sprite.body.velocity.y >= 0) {
      this.fsm.setState('fall');
    }
  }

  _updateFall(delta, input) {
    if (this._checkCommonAirTransitions(input)) return;

    this._handleAirControl(input);

    if (this._wantsJump()) {
      if (this._coyoteTimer > 0) {
        this._consumeJumpBuffer();
        this.fsm.setState('jump');
        return;
      }
      if (this._hasDoubleJump) {
        this._hasDoubleJump = false;
        this._consumeJumpBuffer();
        this.fsm.setState('doubleJump');
        return;
      }
    }

    if (this._isGrounded()) {
      if (this._jumpBufferTimer > 0) {
        this._consumeJumpBuffer();
        this.fsm.setState('jump');
      } else {
        this.fsm.setState(input.axisX() !== 0 ? 'run' : 'idle');
      }
    }
  }

  _updateWallSlide(delta, input) {
    if (this._checkDash(input)) return;
    if (this._checkSlash(input)) return;

    if (this._isGrounded()) {
      this.fsm.setState(input.axisX() !== 0 ? 'run' : 'idle');
      return;
    }

    // Wall jump tiene prioridad
    if (this._wantsJump()) {
      const wallDir = this._getWallDirection() ?? this._lastWallDir;
      if (wallDir !== null) {
        this.fsm.setState('wallJump', -wallDir);
        return;
      }
    }

    // Si ya no está en la pared (ni siquiera con coyote time), cae
    const stillOnWall = this._getWallDirection() !== null || this._wallCoyoteTimer > 0;
    if (!stillOnWall || !this._pressingTowardWall(input)) {
      this.fsm.setState('fall');
      return;
    }

    // Capar velocidad de caída en wall slide
    if (this.sprite.body.velocity.y > WALL_SLIDE_SPEED) {
      this.sprite.body.setVelocityY(WALL_SLIDE_SPEED);
    }
  }

  _updateWallJump(delta, input) {
    if (this._checkCommonAirTransitions(input)) return;

    if (this._wallJumpLockTimer <= 0) {
      this._handleAirControl(input);
    }
    this._applyVariableJump(delta, input);

    if (this._wantsJump() && this._hasDoubleJump) {
      this._hasDoubleJump = false;
      this._consumeJumpBuffer();
      this.fsm.setState('doubleJump');
      return;
    }

    if (this.sprite.body.velocity.y >= 0) {
      this.fsm.setState('fall');
    }
  }

  _updateDoubleJump(delta, input) {
    if (this._checkCommonAirTransitions(input)) return;

    this._handleAirControl(input);
    this._applyVariableJump(delta, input);

    if (this.sprite.body.velocity.y >= 0) {
      this.fsm.setState('fall');
    }
  }

  _updateDash(delta, input) {
    this._dashTimer -= delta;
    if (this._dashTimer <= 0) {
      if (this._isGrounded()) {
        this.fsm.setState(input.axisX() !== 0 ? 'run' : 'idle');
      } else {
        this.fsm.setState('fall');
      }
      return;
    }
    if (this.sprite.body.blocked.left || this.sprite.body.blocked.right) {
      this.fsm.setState('fall');
    }
  }

  _updateSlash(delta, input) {
    const frame = this.fsm.frameCount();

    if (frame < SLASH_STARTUP) return;

    if (frame === SLASH_STARTUP) {
      this._spawnSlashHitbox();
    }

    if (frame < SLASH_STARTUP + SLASH_ACTIVE) return;

    if (frame === SLASH_STARTUP + SLASH_ACTIVE) {
      this._destroySlashHitbox();
    }

    if (frame < SLASH_STARTUP + SLASH_ACTIVE + SLASH_RECOVERY) return;

    this._destroySlashHitbox();
    if (this._isGrounded()) {
      this.fsm.setState(input.axisX() !== 0 ? 'run' : 'idle');
    } else {
      this.fsm.setState('fall');
    }
  }

  _updateHurt(delta, input) {
    this.sprite.setAlpha(
      Math.floor(this._invulnTimer / 80) % 2 === 0 ? 0.3 : 1
    );

    if (this._invulnTimer <= 0) {
      this.sprite.setAlpha(1);
      this.sprite.setTint(0x00ccff);
      if (this._isGrounded()) {
        this.fsm.setState(input.axisX() !== 0 ? 'run' : 'idle');
      } else {
        this.fsm.setState('fall');
      }
    }
  }

  _updateDead(delta, input) {
    if (this._respTimer <= 0) {
      this.scene.scene.restart();
    }
  }

  /* ================================================================
     Movement Handlers
     ================================================================= */

  _handleAirControl(input) {
    const ax = input.axisX();
    if (ax !== 0) {
      this.facing = ax > 0 ? DIR.RIGHT : DIR.LEFT;
      this.sprite.setFlipX(this.facing === DIR.LEFT);
      this.sprite.body.setAccelerationX(
        ax > 0 ? PLAYER_ACCELERATION : -PLAYER_ACCELERATION
      );
    } else {
      this.sprite.body.setAccelerationX(0);
    }
  }

  _applyVariableJump(delta, input) {
    if (this.sprite.body.velocity.y >= 0) return;
    if (input.isDown(KEY.JUMP)) {
      this.sprite.body.velocity.y -= JUMP_HOLD_FORCE * (delta / 1000);
    } else if (this.sprite.body.velocity.y < JUMP_CUT_VELOCITY) {
      this.sprite.body.setVelocityY(JUMP_CUT_VELOCITY);
    }
  }

  _resetAirAbilities() {
    this._hasDoubleJump = true;
  }

  /* ================================================================
     Wall Detection
     ================================================================= */

  _getWallDirection() {
    const body = this.sprite.body;
    if (body.blocked.left) return -1;
    if (body.blocked.right) return 1;
    return null;
  }

  _isTouchingWall() {
    return !this._isGrounded() && this._getWallDirection() !== null;
  }

  _pressingTowardWall(input) {
    const wallDir = this._getWallDirection() ??
      (this._wallCoyoteTimer > 0 ? this._lastWallDir : null);
    if (wallDir === null) return false;
    const ax = input.axisX();
    if (wallDir === -1 && ax < 0) return true;
    if (wallDir === 1 && ax > 0) return true;
    return false;
  }

  /* ================================================================
     Transition Helpers
     ================================================================= */

  _checkCommonAirTransitions(input) {
    return this._checkSlash(input)
        || this._checkDash(input)
        || this._checkWallSlideTransition(input);
  }

  _checkWallSlideTransition(input) {
    if (this._shouldWallSlide(input)) {
      this.fsm.setState('wallSlide');
      return true;
    }
    return false;
  }

  _shouldWallSlide(input) {
    if (this._wallReleaseTimer > 0) return false;
    if (this._wallJumpLockTimer > 0) return false;
    if (!this._pressingTowardWall(input)) return false;

    const onWallNow = this._getWallDirection() !== null;
    const onWallCoyote = this._wallCoyoteTimer > 0;
    if (!onWallNow && !onWallCoyote) return false;

    return true;
  }

  _checkDash(input) {
    if (!this._isActionable()) return false;
    if (this._dashJustPressed && this._dashCooldownTimer <= 0) {
      this.fsm.setState('dash');
      return true;
    }
    return false;
  }

  _checkSlash(input) {
    if (!this._isActionable()) return false;
    if (this._slashJustPressed) {
      this.fsm.setState('slash');
      return true;
    }
    return false;
  }

  /* ================================================================
     Jump Buffer / Input
     ================================================================= */

  _consumeJumpBuffer() {
    this._jumpBufferTimer = 0;
  }

  _wantsJump() {
    return this._jumpJustPressed || this._jumpBufferTimer > 0;
  }

  /* ================================================================
     Combat / Hitboxes
     ================================================================= */

  _spawnSlashHitbox() {
    this._destroySlashHitbox();
    const offsetX = this.facing * SLASH_OFFSET_X;
    this._slashHitbox = this.scene.add.rectangle(
      this.sprite.x + offsetX,
      this.sprite.y,
      SLASH_WIDTH,
      SLASH_HEIGHT,
      0xffff00, 0.4
    );
    this.scene.physics.add.existing(this._slashHitbox, false);
    this._slashHitbox.body.setAllowGravity(false);
  }

  _destroySlashHitbox() {
    if (this._slashHitbox) {
      this._slashHitbox.destroy();
      this._slashHitbox = null;
    }
  }

  /* ================================================================
     Status Checks
     ================================================================= */

  _isActionable() {
    return !this.fsm.is('hurt') && !this.fsm.is('dead') && !this.fsm.is('slash');
  }

  _isGrounded() {
    const body = this.sprite.body;
    return body.blocked.down || body.touching.down;
  }

  takeDamage(amount, sourceX) {
    if (this._invulnTimer > 0) return;
    if (this.fsm.is('dead') || this.fsm.is('hurt')) return;

    this._damageSourceX = sourceX;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.fsm.setState('dead');
    } else {
      this.fsm.setState('hurt');
    }
  }

  /* ================================================================
     Main Update
     ================================================================= */

  update(delta, input) {
    const grounded = this._isGrounded();

    // ---- ground / air bookkeeping ----
    if (grounded) {
      this._coyoteTimer = COYOTE_TIME_MS;
      if (!this._wasGrounded) {
        this._dashCooldownTimer = 0;
      }
      this._resetAirAbilities();
      this._wallReleaseTimer = 0;
      this._wallJumpLockTimer = 0;
    } else {
      this._coyoteTimer -= delta;
    }

    // ---- wall coyote time ----
    const wallDir = this._getWallDirection();
    if (wallDir !== null) {
      this._lastWallDir = wallDir;
      this._wallCoyoteTimer = WALL_COYOTE_TIME_MS;
    } else {
      this._wallCoyoteTimer -= delta;
    }

    // ---- timer decay ----
    if (this._dashCooldownTimer > 0) this._dashCooldownTimer -= delta;
    if (this._wallReleaseTimer > 0) this._wallReleaseTimer -= delta;
    if (this._wallJumpLockTimer > 0) this._wallJumpLockTimer -= delta;
    if (this._invulnTimer > 0) this._invulnTimer -= delta;
    if (this._respTimer > 0) this._respTimer -= delta;
    if (this._jumpBufferTimer > 0) this._jumpBufferTimer -= delta;

    // ---- input caching (una vez por frame) ----
    this._jumpJustPressed = input.justDown(KEY.JUMP);
    this._dashJustPressed = input.justDown(KEY.DASH);
    this._slashJustPressed = input.justDown(KEY.SLASH);

    if (this._jumpJustPressed) {
      this._jumpBufferTimer = JUMP_BUFFER_MS;
    }

    // ---- state machine ----
    this.fsm.update(delta, input);
    this._wasGrounded = grounded;
  }
}
