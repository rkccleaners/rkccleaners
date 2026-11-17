import { gsap } from 'gsap';
import { createEntryGuard, findEntryPoint } from './process-scroll.js';

export function setupProcessEntry(concepts) {
  const guard = createEntryGuard();
  let touchY = null;
  let caughtTouch = false;
  let previousScroll = scrollY;
  let entry = null;
  let arrival;
  let explicitNavigation = false;
  const positionsFor = (direction) =>
    concepts.map((concept) =>
      Math.max(
        0,
        Math.min(
          document.documentElement.scrollHeight - innerHeight,
          direction > 0 ? concept.start() : concept.end(),
        ),
      ),
    );
  const enter = (index, direction, position) => {
    arrival?.kill();
    concepts.forEach((concept) => concept.cancel());
    concepts[index].enter(direction);
    const page = { y: scrollY };
    entry = { page };
    arrival = gsap.to(page, {
      y: position,
      duration: Math.min(
        0.65,
        Math.max(0.2, Math.abs(position - page.y) / 1200),
      ),
      ease: 'power1.out',
      onUpdate: () => {
        previousScroll = page.y;
        window.scrollTo({ top: page.y, behavior: 'instant' });
      },
    });
  };
  const catchEntry = (delta, origin = scrollY, afterScroll = false) => {
    const direction = Math.sign(delta);
    if (
      !afterScroll &&
      concepts.some(
        (concept) => origin > concept.start() + 8 && origin < concept.end() - 8,
      )
    )
      return false;
    const positions = positionsFor(direction);
    const index = findEntryPoint(positions, origin, delta, 0);
    if (index < 0) return false;
    enter(index, direction, positions[index]);
    return true;
  };
  const onScroll = () => {
    const current = scrollY;
    const origin = previousScroll;
    previousScroll = current;
    if (explicitNavigation) return;
    // Chrome can apply compositor scrolling before a cancellable input arrives.
    if (entry) {
      if (Math.abs(current - entry.page.y) > 1)
        window.scrollTo({ top: entry.page.y, behavior: 'instant' });
    } else if (catchEntry(current - origin, origin, true)) {
      guard.enter(current - origin);
    }
  };
  const allowNavigation = () => {
    explicitNavigation = true;
    arrival?.kill();
    entry = null;
    guard.reset();
  };
  const onClick = (event) => {
    if (event.target.closest?.('a, button')) allowNavigation();
  };
  const onKey = (event) => {
    if (event.key === 'Home' || event.key === 'End') allowNavigation();
    else {
      arrival?.kill();
      entry = null;
      guard.reset();
    }
  };
  const onWheel = (event) => {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
    )
      return;
    const delta =
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (!delta) return;
    explicitNavigation = false;
    if (guard.consume(delta, event.timeStamp)) {
      if (event.cancelable) event.preventDefault();
      return;
    }
    arrival?.kill();
    entry = null;
    if (catchEntry(delta)) {
      guard.enter(delta, event.timeStamp);
      if (event.cancelable) event.preventDefault();
    }
  };
  const onTouchStart = (event) => {
    arrival?.kill();
    explicitNavigation = false;
    entry = null;
    guard.reset();
    touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    caughtTouch = false;
  };
  const onTouchMove = (event) => {
    if (touchY === null || event.touches.length !== 1 || !event.cancelable)
      return;
    const y = event.touches[0].clientY;
    const delta = touchY - y;
    touchY = y;
    if (caughtTouch || (delta && catchEntry(delta))) {
      caughtTouch = true;
      event.preventDefault();
    }
  };
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  window.addEventListener('scroll', onScroll, { capture: true, passive: true });
  window.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', allowNavigation);
  window.addEventListener('touchstart', onTouchStart, {
    capture: true,
    passive: true,
  });
  window.addEventListener('touchmove', onTouchMove, {
    capture: true,
    passive: false,
  });
  return () => {
    arrival?.kill();
    window.removeEventListener('wheel', onWheel, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', allowNavigation);
    window.removeEventListener('touchstart', onTouchStart, true);
    window.removeEventListener('touchmove', onTouchMove, true);
  };
}
