export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export const TILE_SIZE = 16;

export const PLAYER_WIDTH = 20;
export const PLAYER_HEIGHT = 40;
export const PLAYER_SPRITE_WIDTH = 32;
export const PLAYER_SPRITE_HEIGHT = 48;

export const GRAVITY = 900;

export const PLAYER_SPEED = 180;
export const PLAYER_ACCELERATION = 900;
export const PLAYER_DRAG = 500;

export const JUMP_VELOCITY = -330;
export const JUMP_HOLD_FORCE = -60;
export const JUMP_CUT_VELOCITY = -80;

// Timers en milisegundos para consistencia a cualquier framerate
export const COYOTE_TIME_MS = 100;
export const JUMP_BUFFER_MS = 100;

export const WALL_SLIDE_SPEED = 40;
export const WALL_SLIDE_FRICTION = 0.3;

export const WALL_JUMP_VELOCITY_X = 60;      // empuje mínimo para separarse de la pared
export const WALL_JUMP_VELOCITY_Y = -320;
export const WALL_JUMP_LOCK_TIME_MS = 0;     // control total desde el frame 1
export const WALL_RELEASE_TIME_MS = 200;     // tiempo sin poder re-agarrar la misma pared
export const WALL_COYOTE_TIME_MS = 80;       // grace time tras dejar la pared

export const DOUBLE_JUMP_VELOCITY = -330;

export const DASH_SPEED = 600;
export const DASH_SPEED_AIR = 850;
export const DASH_DURATION_MS = 180;         // duración del dash en ms
export const DASH_COOLDOWN = 500;

export const FAST_FALL_SPEED = 500;
export const FAST_FALL_COOLDOWN = 300;

export const SLASH_STARTUP = 2;
export const SLASH_ACTIVE = 4;
export const SLASH_RECOVERY = 5;
export const SLASH_WIDTH = 36;
export const SLASH_HEIGHT = 28;
export const SLASH_OFFSET_X = 14;

export const SLAM_SPEED = 700;
export const SLAM_AOE_RADIUS = 48;

export const INVULN_DURATION = 400;
export const PLAYER_MAX_HP = 5;

export const RESPAWN_DELAY = 800;
