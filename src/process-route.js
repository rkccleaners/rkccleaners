import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  createScrollGesture,
  createRouteTransition,
  createTravelEase,
  createFastScroll,
} from './process-scroll.js';

export function setupRoute(root, { mobile, reducedMotion }) {
  const journey = root.querySelector('.journey');
  const paths = [...root.querySelectorAll('.road-svg > path')];
  const truck = root.querySelector('.delivery-truck');
  const overhead = truck.classList.contains('top-down-truck');
  const drawing = truck.querySelector('svg');
  const steps = [...root.querySelectorAll('.process-step')];
  const stops = [...root.querySelectorAll('.road-stop')];
  const previous = root.querySelector('[data-route-prev]');
  const next = root.querySelector('[data-route-next]');
  const count = root.querySelector('.route-count');
  const skip = root.querySelector('[data-route-skip]');
  const route = mobile
    ? 'M130 170 C210 280 50 390 130 510 S210 730 130 850 S50 1070 130 1190'
    : 'M320 170 C320 330 680 350 680 510 S320 690 320 850 S680 1030 680 1190';
  paths.forEach((path) => path.setAttribute('d', route));
  const path = paths[0];
  const length = path.getTotalLength();
  const distances = steps.map((_, index) => {
    let low = 0;
    let high = length;
    for (let i = 0; i < 20; i++) {
      const middle = (low + high) / 2;
      if (path.getPointAtLength(middle).y < 170 + index * 340) low = middle;
      else high = middle;
    }
    return (low + high) / 2;
  });
  const position = { distance: 0 };
  let selected = -1;
  let direction = 1;
  const transition = createRouteTransition();
  let travel;
  let pageTravel;
  let truckMotion;
  let pageMotion;
  const scrollGesture = createScrollGesture();
  const fastScroll = createFastScroll();
  let touchStart = null;
  let width = journey.clientWidth;
  let height = journey.clientHeight;
  const clampStop = (index) => gsap.utils.clamp(0, 3, index);
  const readingPosition = () =>
    (((innerHeight * 0.52 - journey.getBoundingClientRect().top) / height) *
      1360 -
      170) /
    340;
  const stopScroll = (index) => {
    const rect = steps[index].getBoundingClientRect();
    return Math.max(
      0,
      scrollY + rect.top + rect.height / 2 - innerHeight * 0.52,
    );
  };
  const inRoute = () => {
    const rect = journey.getBoundingClientRect();
    return rect.top < innerHeight * 0.6 && rect.bottom > innerHeight * 0.4;
  };
  gsap.set(truck, {
    left: 0,
    top: 0,
    xPercent: -50,
    yPercent: overhead ? -50 : -84,
  });
  if (overhead) gsap.set(drawing, { transformOrigin: '50% 50%' });
  const setX = gsap.quickSetter(truck, 'x', 'px');
  const setY = gsap.quickSetter(truck, 'y', 'px');
  const rotate = gsap.quickSetter(drawing, 'rotation', 'deg');
  const render = () => {
    const point = path.getPointAtLength(position.distance);
    const ahead = path.getPointAtLength(
      Math.min(length, position.distance + 2),
    );
    const behind = path.getPointAtLength(Math.max(0, position.distance - 2));
    const dx = ((ahead.x - behind.x) * width) / 1000;
    const dy = ((ahead.y - behind.y) * height) / 1360;
    const magnitude = Math.hypot(dx, dy) || 1;
    const lane = overhead ? (mobile ? 8 : 12) * direction : 0;
    setX((point.x / 1000) * width - (dy / magnitude) * lane);
    setY((point.y / 1360) * height + (dx / magnitude) * lane);
    if (overhead)
      rotate((Math.atan2(dx, -dy) * 180) / Math.PI + (direction < 0 ? 180 : 0));
    else if (Math.abs(dx) > 0.01)
      truck.classList.toggle('is-reversed', dx * direction < 0);
  };
  const markStop = () => {
    steps.forEach((step, i) =>
      step.classList.toggle('has-arrived', i === selected),
    );
    stops.forEach((stop, i) =>
      stop.classList.toggle('has-arrived', i === selected),
    );
    const label = `Stop ${selected + 1} of 4`;
    if (count.textContent !== label) count.textContent = label;
    previous.disabled = selected === 0;
    next.disabled = selected === 3;
    root.dataset.stop = String(selected);
  };
  const go = (index, navigate = false, immediate = false) => {
    index = clampStop(index);
    if (
      index !== selected ||
      immediate ||
      (!transition.moving &&
        Math.abs(position.distance - distances[index]) > 0.1)
    ) {
      const velocity =
        transition.moving && truckMotion && travel
          ? truckMotion.velocityAt(travel.progress()) * travel.timeScale()
          : undefined;
      const run = transition.begin(!immediate && !reducedMotion);
      direction = distances[index] >= position.distance ? 1 : -1;
      selected = index;
      travel?.kill();
      const duration =
        immediate || reducedMotion
          ? 0
          : direction < 0
            ? overhead
              ? 0.75
              : 1
            : 1.5;
      truckMotion = createTravelEase(
        distances[index] - position.distance,
        duration,
        velocity,
      );
      root.dataset.moving = String(!immediate && !reducedMotion);
      truck.classList.toggle('is-driving', !immediate && !reducedMotion);
      travel = gsap.to(position, {
        distance: distances[index],
        duration,
        ease: truckMotion.ease,
        onUpdate: render,
        onComplete: () => {
          if (!transition.finish(run)) return;
          root.dataset.moving = 'false';
          truck.classList.remove('is-driving');
          markStop();
        },
        onInterrupt: () => {
          if (!transition.finish(run)) return;
          root.dataset.moving = 'false';
          truck.classList.remove('is-driving');
        },
      });
      markStop();
    }
    if (navigate) {
      const velocity =
        pageTravel?.isActive() && pageMotion
          ? pageMotion.velocityAt(pageTravel.progress()) *
            pageTravel.timeScale()
          : undefined;
      pageTravel?.kill();
      const page = { y: scrollY };
      const destination = stopScroll(index);
      const duration = reducedMotion
        ? 0
        : direction < 0
          ? overhead
            ? 0.7
            : 0.95
          : 1.45;
      pageMotion = createTravelEase(destination - page.y, duration, velocity);
      pageTravel = gsap.to(page, {
        y: destination,
        duration,
        ease: pageMotion.ease,
        onUpdate: () => window.scrollTo({ top: page.y, behavior: 'instant' }),
      });
    }
  };
  const syncScroll = () => {
    // GSAP reports isActive() as false until a new tween's first render.
    if (transition.moving || pageTravel?.isActive()) return;
    go(Math.round(readingPosition()), false, true);
  };
  const requestStep = (sign) => {
    if (clampStop(selected + sign) === selected) return;
    go(selected + sign, true);
  };
  const onWheel = (event) => {
    if (
      reducedMotion ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
    )
      return;
    const delta =
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    const sign = Math.sign(delta);
    const fast = fastScroll(delta, event.timeStamp);
    if (!inRoute()) return;
    if (
      (sign > 0 && readingPosition() < -0.01) ||
      (sign < 0 && readingPosition() > 3.01)
    )
      return;
    if (
      !sign ||
      (!transition.moving &&
        ((selected === 3 && sign > 0) || (selected === 0 && sign < 0)))
    )
      return;
    if (!event.cancelable) return;
    event.preventDefault();
    const gesture = scrollGesture(delta, event.timeStamp);
    if (fast) {
      const destination = sign > 0 ? 3 : 0;
      if (selected !== destination) go(destination, true);
      travel?.timeScale(3);
      pageTravel?.timeScale(3);
      return;
    }
    if (gesture) requestStep(gesture);
  };
  const onKey = (event) => {
    if (
      reducedMotion ||
      !inRoute() ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.target.closest(
        'button, a, input, textarea, select, [contenteditable]',
      )
    )
      return;
    if (['Home', 'End'].includes(event.key)) {
      onSkip();
      return;
    }
    const sign =
      ['ArrowUp', 'PageUp'].includes(event.key) ||
      (event.key === ' ' && event.shiftKey)
        ? -1
        : ['ArrowDown', 'PageDown', ' '].includes(event.key)
          ? 1
          : 0;
    if (!sign || (selected === 3 && sign > 0) || (selected === 0 && sign < 0))
      return;
    event.preventDefault();
    if (!event.repeat) requestStep(sign);
  };
  const onTouchStart = (event) => {
    touchStart =
      event.touches.length === 1
        ? {
            y: event.touches[0].clientY,
            stop: selected,
            requested: false,
            skipped: false,
          }
        : null;
  };
  const onTouchMove = (event) => {
    if (
      reducedMotion ||
      event.defaultPrevented ||
      !touchStart ||
      event.touches.length !== 1 ||
      !inRoute()
    )
      return;
    const delta = touchStart.y - event.touches[0].clientY;
    const sign = Math.sign(delta);
    if (
      Math.abs(delta) < 28 ||
      (!transition.moving &&
        ((selected === 3 && sign > 0) || (selected === 0 && sign < 0)))
    )
      return;
    if (!event.cancelable) return;
    event.preventDefault();
    if (Math.abs(delta) > 360 && !touchStart.skipped) {
      touchStart.skipped = true;
      go(touchStart.stop + sign * 3, true);
    } else if (!touchStart.requested) {
      touchStart.requested = true;
      requestStep(sign);
    }
  };
  const onPrevious = () => {
    go(selected - 1, true);
  };
  const onNext = () => {
    go(selected + 1, true);
  };
  const onSkip = () => {
    transition.cancel();
    travel?.kill();
    pageTravel?.kill();
    root.dataset.moving = 'false';
    truck.classList.remove('is-driving');
  };
  const onEnter = (event) => {
    onSkip();
    go(event.detail > 0 ? 0 : 3, false, true);
  };
  root.addEventListener('process:enter', onEnter);
  root.addEventListener('process:cancel', onSkip);
  previous.addEventListener('click', onPrevious);
  next.addEventListener('click', onNext);
  skip.addEventListener('click', onSkip);
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  ScrollTrigger.create({
    trigger: journey,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: syncScroll,
    onRefresh: () => {
      onSkip();
      width = journey.clientWidth;
      height = journey.clientHeight;
      go(Math.round(readingPosition()), false, true);
      render();
    },
  });
  go(Math.round(readingPosition()), false, true);
  return () => {
    onSkip();
    root.removeEventListener('process:enter', onEnter);
    root.removeEventListener('process:cancel', onSkip);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    previous.removeEventListener('click', onPrevious);
    next.removeEventListener('click', onNext);
    skip.removeEventListener('click', onSkip);
    truck.classList.remove('is-reversed');
  };
}
