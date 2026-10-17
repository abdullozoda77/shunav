// Shared by the book and author carousels: where an item stands in a 3D "cover flow",
// by its distance from the current one (-1 left, 0 middle, 1 right, ±2 hidden behind the sides).

// A soft "arrive and settle" curve; the move takes this long
export const FAN_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
export const FAN_MS = 900;

// -1, 0, 1 for the visible items; ±2 for the rest (the list goes round: after the last comes the first)
export function fanDistance(index, current, count) {
  let d = (index - current + count) % count;
  if (d > count / 2) d -= count;
  return Math.max(-2, Math.min(2, d));
}

// spread = how far (px) the side items stand from the middle
export function fanStyle(distance, spread) {
  const side = Math.sign(distance);
  const far = Math.abs(distance) === 2;
  const middle = distance === 0;

  const x = middle ? 0 : side * spread * (far ? 1.5 : 1);
  const turn = middle ? 0 : -side * (far ? 60 : 38); // side items turn their face toward the middle
  const scale = middle ? 1 : far ? 0.7 : 0.84;

  return {
    transform: `translateX(${x}px) translateZ(${middle ? 60 : 0}px) rotateY(${turn}deg) scale(${scale})`,
    opacity: far ? 0 : 1,
    filter: middle ? "brightness(1)" : "brightness(0.6) saturate(0.85)", // sides a little in the shadow
    zIndex: middle ? 20 : far ? 0 : 10,
    pointerEvents: far ? "none" : "auto",
    transition: `transform ${FAN_MS}ms ${FAN_EASE}, opacity ${FAN_MS}ms ${FAN_EASE}, filter ${FAN_MS}ms ${FAN_EASE}`,
  };
}
