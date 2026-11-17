export function createScrollGesture() {
  let previousTime = -Infinity;
  let previousDelta = 0;
  let direction = 0;
  let effort = 0;
  let previousStep = -Infinity;
  let decaySamples = 0;
  let momentum = false;
  return (delta, now = performance.now()) => {
    if (Math.abs(delta) < 3) return 0;
    const sign = Math.sign(delta);
    const gap = now - previousTime;
    const reversal = sign !== direction && Math.abs(delta) >= 8;
    const newImpulse =
      gap >= 80 &&
      Math.abs(delta) >= 24 &&
      Math.abs(delta) > Math.abs(previousDelta) * 3;
    const renewed =
      momentum && Math.abs(delta) >= Math.max(8, Math.abs(previousDelta) * 1.5);
    const separate = gap > 180 || reversal || newImpulse || renewed;
    decaySamples =
      !separate && Math.abs(delta) < Math.abs(previousDelta) * 0.99
        ? decaySamples + 1
        : 0;
    if (separate) momentum = false;
    else if (decaySamples >= 3) momentum = true;
    // Continued wheel input is intentional; a decaying momentum tail is not.
    const sustained =
      sign === direction &&
      !momentum &&
      Math.abs(delta) >= 3 &&
      Math.abs(delta) >= Math.abs(previousDelta) * 0.85;
    effort = sustained ? effort + Math.abs(delta) : 0;
    const continued = effort >= 300 && now - previousStep >= 1200;
    previousTime = now;
    previousDelta = delta;
    if (!separate && !continued) return 0;
    effort = 0;
    previousStep = now;
    direction = sign;
    return sign;
  };
}

export function createRouteTransition() {
  let generation = 0;
  let moving = false;
  return {
    get moving() {
      return moving;
    },
    begin(animated) {
      moving = animated;
      return ++generation;
    },
    finish(token) {
      if (token !== generation) return false;
      moving = false;
      return true;
    },
    cancel() {
      generation++;
      moving = false;
    },
  };
}

export function createTravelEase(distance, duration, velocity) {
  if (!duration || Math.abs(distance) < 0.001) {
    return { ease: (t) => t, velocityAt: () => 0 };
  }
  const slope =
    velocity === undefined
      ? 1.5
      : Math.max(0, Math.min(3, (velocity * duration) / distance));
  // Match the incoming speed and ease to rest only at the current destination.
  return {
    ease: (t) => ((slope - 2) * t + 3 - 2 * slope) * t * t + slope * t,
    velocityAt: (t) =>
      (distance / duration) *
      (3 * (slope - 2) * t * t + 2 * (3 - 2 * slope) * t + slope),
  };
}

export function createFastScroll() {
  let previousTime = -Infinity;
  let windowStart = 0;
  let amount = 0;
  let direction = 0;
  let fast = false;
  let previousDelta = 0;
  return (delta, now = performance.now()) => {
    const sign = Math.sign(delta);
    if (!sign) return false;
    if (now - previousTime > 180 || sign !== direction) {
      fast = false;
      amount = 0;
      previousDelta = 0;
      windowStart = now;
    } else if (now - windowStart > 320) {
      amount = 0;
      windowStart = now;
    }
    const decaying =
      sign === direction && Math.abs(delta) < Math.abs(previousDelta) * 0.99;
    amount = decaying ? 0 : amount + Math.abs(delta);
    fast ||= Math.abs(delta) >= 1800 || amount >= 1600;
    previousTime = now;
    direction = sign;
    previousDelta = delta;
    return fast;
  };
}

export function createEntryGuard() {
  let direction = 0;
  let previousTime = -Infinity;
  let previousDelta = 0;
  let decays = 0;
  return {
    reset() {
      direction = 0;
    },
    enter(delta, now = performance.now()) {
      direction = Math.sign(delta);
      previousTime = now;
      previousDelta = Math.abs(delta);
      decays = 0;
    },
    consume(delta, now = performance.now()) {
      if (!direction) return false;
      const magnitude = Math.abs(delta);
      const renewed =
        decays >= 2 && magnitude >= 8 && magnitude > previousDelta * 2;
      if (
        Math.sign(delta) !== direction ||
        now - previousTime > 180 ||
        renewed
      ) {
        direction = 0;
        return false;
      }
      if (magnitude >= 3) {
        previousTime = now;
        if (magnitude < previousDelta * 0.99) decays++;
        previousDelta = magnitude;
      }
      return true;
    },
  };
}

export function findEntryPoint(points, scroll, delta, viewport) {
  const direction = Math.sign(delta);
  const candidates = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => direction * (point - scroll) > 8)
    .sort((a, b) => direction * (a.point - b.point));
  const match = candidates.find(
    ({ point }) =>
      Math.abs(point - scroll) <= viewport * 0.45 ||
      direction * (scroll + delta - point) >= 0,
  );
  return match ? match.index : -1;
}
