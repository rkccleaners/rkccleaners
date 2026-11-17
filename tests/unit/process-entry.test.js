import assert from 'node:assert/strict';
import test from 'node:test';
import { gsap } from 'gsap';
import { setupProcessEntry } from '../../src/process-entry.js';

function page(t, initialScroll = 0) {
  const listeners = new Map();
  const saved = new Map();
  const set = (name, value) => {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  };
  set('scrollY', initialScroll);
  set('innerHeight', 900);
  set('document', { documentElement: { scrollHeight: 6000 } });
  set('window', {
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
    scrollTo: ({ top }) => {
      globalThis.scrollY = top;
    },
  });
  const entries = [];
  const cleanup = setupProcessEntry(
    [1000, 3500].map((start, index) => ({
      start: () => start,
      end: () => start + 1000,
      cancel() {},
      enter: (direction) => entries.push([index, direction]),
    })),
  );
  t.after(() => {
    cleanup();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return {
    entries,
    arrive(progress = 1) {
      gsap.globalTimeline
        .getChildren()
        .forEach((tween) => tween.progress(progress));
    },
    scroll(top) {
      globalThis.scrollY = top;
      listeners.get('scroll')?.();
    },
    emit(name, event) {
      listeners.get(name)?.(event);
    },
  };
}

for (const [name, initial, destination, expected, entry] of [
  ['first road from above', 0, 1400, 1000, [0, 1]],
  ['first road from below', 2500, 1600, 2000, [0, -1]],
  ['third road from above', 2800, 3950, 3500, [1, 1]],
  ['third road from below', 5100, 4100, 4500, [1, -1]],
]) {
  test(`catches a native scroll overshoot entering ${name}`, (t) => {
    const browser = page(t, initial);
    browser.scroll(destination);
    assert.equal(scrollY, destination, 'entry does not jump immediately');
    browser.arrive(0.5);
    assert.ok(
      scrollY > Math.min(destination, expected) &&
        scrollY < Math.max(destination, expected),
    );
    browser.arrive();
    assert.equal(scrollY, expected);
    assert.deepEqual(browser.entries, [entry]);
    browser.scroll(destination + 30);
    assert.equal(scrollY, expected, 'momentum cannot undo the entry catch');
  });
}

test('a separate gesture can leave the entry stop', (t) => {
  const browser = page(t);
  browser.scroll(1400);
  browser.arrive();
  browser.emit('wheel', {
    deltaY: 80,
    deltaX: 0,
    deltaMode: 0,
    cancelable: true,
    timeStamp: performance.now() + 500,
    preventDefault() {},
  });
  browser.scroll(1350);
  assert.equal(scrollY, 1350);
});

test('explicit navigation can skip a concept', (t) => {
  const browser = page(t);
  browser.emit('click', { target: { closest: () => ({}) } });
  browser.scroll(3950);
  assert.equal(scrollY, 3950);
  assert.deepEqual(browser.entries, []);
});

test('approaching a section scrolls naturally without snapping ahead', (t) => {
  const browser = page(t, 700);
  let prevented = false;
  browser.emit('wheel', {
    deltaY: 80,
    deltaX: 0,
    deltaMode: 0,
    cancelable: true,
    timeStamp: performance.now(),
    preventDefault() {
      prevented = true;
    },
  });
  browser.arrive();
  assert.equal(scrollY, 700);
  assert.equal(prevented, false);
  assert.deepEqual(browser.entries, []);
});

test('a crossing wheel gesture eases to the opening without teleporting', (t) => {
  const browser = page(t, 900);
  let prevented = false;
  browser.emit('wheel', {
    deltaY: 2000,
    deltaX: 0,
    deltaMode: 0,
    cancelable: true,
    timeStamp: performance.now(),
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(scrollY, 900);
  assert.equal(prevented, true);
  browser.arrive(0.5);
  assert.ok(scrollY > 900 && scrollY < 1000);
  browser.arrive();
  assert.equal(scrollY, 1000);
});
