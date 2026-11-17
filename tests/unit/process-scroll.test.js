import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createScrollGesture,
  createRouteTransition,
  createTravelEase,
  createFastScroll,
  createEntryGuard,
  findEntryPoint,
} from '../../src/process-scroll.js';
import { gsap } from 'gsap';

test('one trackpad gesture and its fading momentum advance once', () => {
  const gesture = createScrollGesture();
  const trace = [
    [0, 80],
    [16, 110],
    [35, 95],
    [70, 60],
    [120, 25],
    [200, 9],
    [310, 4],
  ];
  assert.deepEqual(
    trace.map(([time, delta]) => gesture(delta, time)),
    [1, 0, 0, 0, 0, 0, 0],
  );
});

test('a separate scroll near arrival registers even when the previous one is unfinished', () => {
  const gesture = createScrollGesture();
  assert.equal(gesture(80, 0), 1);
  assert.equal(gesture(30, 40), 0);
  assert.equal(gesture(90, 740), 1);
});

test('a new push after a momentum tail registers without requiring a long pause', () => {
  const gesture = createScrollGesture();
  assert.equal(gesture(90, 0), 1);
  assert.equal(gesture(8, 80), 0);
  assert.equal(gesture(75, 180), 1);
});

test('reversing direction responds immediately', () => {
  const gesture = createScrollGesture();
  assert.equal(gesture(80, 0), 1);
  assert.equal(gesture(-60, 50), -1);
  assert.equal(gesture(-30, 80), 0);
});

test('small trackpad jitter does not reverse the route', () => {
  const gesture = createScrollGesture();
  assert.equal(gesture(80, 0), 1);
  assert.equal(gesture(-4, 40), 0);
  assert.equal(gesture(5, 70), 0);
});

test('a large event still represents only one gesture', () => {
  const gesture = createScrollGesture();
  assert.equal(gesture(3200, 0), 1);
  assert.equal(gesture(2000, 30), 0);
});

test('zero input and subpixel noise cannot create a step', () => {
  const gesture = createScrollGesture();
  assert.equal(gesture(0, 0), 0);
  assert.equal(gesture(0.5, 50), 0);
  assert.equal(gesture(80, 60), 1);
});

test('a road transition is busy before GSAP renders its first frame', () => {
  gsap.ticker.sleep();
  const transition = createRouteTransition();
  const run = transition.begin(true);
  const position = { distance: 0 };
  const tween = gsap.to(position, {
    distance: 100,
    duration: 1,
    onComplete: () => transition.finish(run),
  });
  try {
    assert.equal(tween.isActive(), false);
    assert.equal(transition.moving, true);
    tween.totalTime(1);
    assert.equal(position.distance, 100);
    assert.equal(transition.moving, false);
  } finally {
    tween.kill();
    gsap.ticker.sleep();
  }
});

test('a cancelled trip cannot finish or unlock its replacement', () => {
  const transition = createRouteTransition();
  const oldTrip = transition.begin(true);
  transition.cancel();
  const newTrip = transition.begin(true);
  assert.equal(transition.finish(oldTrip), false);
  assert.equal(transition.moving, true);
  assert.equal(transition.finish(newTrip), true);
  assert.equal(transition.moving, false);
});

test('skipping or refreshing clears transition state and ignores late callbacks', () => {
  const transition = createRouteTransition();
  const oldTrip = transition.begin(true);
  transition.cancel();
  assert.equal(transition.moving, false);
  assert.equal(transition.finish(oldTrip), false);
  const refreshedTrip = transition.begin(false);
  assert.equal(transition.finish(refreshedTrip), true);
  assert.equal(transition.moving, false);
});

test('a normal wheel burst stops at the next step', () => {
  const gesture = createScrollGesture();
  const steps = Array.from({ length: 13 }, (_, i) => gesture(80, i * 40));
  assert.equal(
    steps.reduce((total, step) => total + step, 0),
    1,
  );
});

test('sustained reverse input moves back the corresponding number of stops', () => {
  const gesture = createScrollGesture();
  const forward = Array.from({ length: 76 }, (_, i) => gesture(80, i * 40));
  const backward = Array.from({ length: 76 }, (_, i) =>
    gesture(-80, 3600 + i * 40),
  );
  assert.equal(
    forward.reduce((total, step) => total + step, 0),
    3,
  );
  assert.equal(
    backward.reduce((total, step) => total + step, 0),
    -3,
  );
});

test('small continuous trackpad deltas keep advancing too', () => {
  const gesture = createScrollGesture();
  const steps = Array.from({ length: 100 }, (_, i) => gesture(8, i * 16));
  assert.equal(
    steps.reduce((total, step) => total + step, 0),
    2,
  );
});

test('continued input reaches the next step only near the current arrival', () => {
  const gesture = createScrollGesture();
  const events = Array.from({ length: 76 }, (_, i) => ({
    time: i * 40,
    step: gesture(80, i * 40),
  }));
  const advances = events.filter((event) => event.step === 1);
  assert.equal(advances.length, 3);
  assert.ok(advances[1].time >= 1125);
  assert.ok(advances[2].time - advances[1].time >= 1125);
});

test('extending a trip preserves its current velocity', () => {
  const first = createTravelEase(500, 1.5);
  const velocity = first.velocityAt(0.75);
  const extended = createTravelEase(650, 1.5, velocity);
  assert.ok(Math.abs(extended.velocityAt(0) - velocity) < 0.001);
  assert.ok(extended.velocityAt(0) > 0);
  assert.ok(Math.abs(extended.velocityAt(1)) < 0.001);
});

test('a continued trip moves smoothly forward and settles exactly at its destination', () => {
  const motion = createTravelEase(650, 1.5, 150);
  assert.equal(motion.ease(0), 0);
  assert.equal(motion.ease(1), 1);
  for (let i = 1; i <= 100; i++) {
    assert.ok(motion.ease(i / 100) >= motion.ease((i - 1) / 100));
  }
});

test('zero-duration positioning remains immediate and finite', () => {
  const motion = createTravelEase(0, 0, 0);
  assert.equal(motion.ease(1), 1);
  assert.equal(motion.velocityAt(0), 0);
});

test('ordinary scrolling does not trigger fast-forward', () => {
  const fastScroll = createFastScroll();
  for (let i = 0; i < 76; i++) assert.equal(fastScroll(80, i * 40), false);
});

test('a strong burst enables fast-forward without further input', () => {
  const fastScroll = createFastScroll();
  assert.equal(fastScroll(400, 0), false);
  assert.equal(fastScroll(400, 40), false);
  assert.equal(fastScroll(400, 80), false);
  assert.equal(fastScroll(400, 120), true);
});

test('a very large wheel event fast-forwards immediately', () => {
  assert.equal(createFastScroll()(2000, 0), true);
});

test('fast-forward resets for a later ordinary gesture or a reversal', () => {
  const fastScroll = createFastScroll();
  assert.equal(fastScroll(2000, 0), true);
  assert.equal(fastScroll(80, 40), true);
  assert.equal(fastScroll(80, 300), false);
  assert.equal(fastScroll(2000, 400), true);
  assert.equal(fastScroll(-80, 450), false);
});

test('a large scroll catches the first concept crossed rather than skipping them all', () => {
  assert.equal(findEntryPoint([500, 2500, 6000], 0, 9000, 900), 0);
  assert.equal(findEntryPoint([500, 2500, 6000], 1000, 9000, 900), 1);
  assert.equal(findEntryPoint([500, 2500, 6000], 3000, 9000, 900), 2);
});

test('entry catches work in reverse and leave unrelated scrolling alone', () => {
  assert.equal(findEntryPoint([1500, 5000, 7500], 9000, -9000, 900), 2);
  assert.equal(findEntryPoint([500, 2500], 0, 40, 900), -1);
  assert.equal(findEntryPoint([500, 2500], 500, 40, 900), -1);
});

test('entry absorbs the incoming gesture and its momentum', () => {
  const guard = createEntryGuard();
  guard.enter(3000, 0);
  assert.equal(guard.consume(2000, 40), true);
  assert.equal(guard.consume(500, 100), true);
  assert.equal(guard.consume(80, 200), true);
});

test('a separate gesture or reversal releases the entry catch', () => {
  const guard = createEntryGuard();
  guard.enter(3000, 0);
  assert.equal(guard.consume(80, 250), false);
  guard.enter(3000, 300);
  assert.equal(guard.consume(-80, 330), false);
});

test('a long decaying trackpad momentum tail does not advance another stop', () => {
  const gesture = createScrollGesture();
  const steps = Array.from({ length: 120 }, (_, i) =>
    gesture(300 * 0.97 ** i, i * 16),
  );
  assert.equal(
    steps.reduce((total, step) => total + step, 0),
    1,
  );
});

test('a decaying trackpad flick is not a sustained fast-forward request', () => {
  const fastScroll = createFastScroll();
  const samples = Array.from({ length: 120 }, (_, i) =>
    fastScroll(300 * 0.97 ** i, i * 16),
  );
  assert.equal(samples.some(Boolean), false);
});

test('rounded momentum values do not restart navigation when the tail flattens', () => {
  const gesture = createScrollGesture();
  const steps = Array.from({ length: 180 }, (_, i) =>
    gesture(Math.round(300 * 0.97 ** i), i * 16),
  );
  assert.equal(
    steps.reduce((total, step) => total + step, 0),
    1,
  );
});

test('a new finger push releases entry while old momentum is still arriving', () => {
  const guard = createEntryGuard();
  guard.enter(120, 0);
  assert.equal(guard.consume(100, 16), true);
  assert.equal(guard.consume(60, 32), true);
  assert.equal(guard.consume(20, 48), true);
  assert.equal(guard.consume(80, 64), false);
});

test('the rising beginning of the incoming flick cannot release entry', () => {
  const guard = createEntryGuard();
  guard.enter(20, 0);
  assert.equal(guard.consume(60, 16), true);
  assert.equal(guard.consume(120, 32), true);
});
