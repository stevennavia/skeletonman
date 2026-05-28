export const DIR = {
  LEFT: -1,
  RIGHT: 1,
};

export function sign(n) {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function facingDir(velocityX) {
  return velocityX >= 0 ? DIR.RIGHT : DIR.LEFT;
}

export function facingDirFromInput(left, right) {
  if (right) return DIR.RIGHT;
  if (left) return DIR.LEFT;
  return null;
}
