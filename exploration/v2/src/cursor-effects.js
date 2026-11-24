import { gsap } from 'gsap';
import { createCursorText } from './cursor-text';
import { createCursorTrail } from './cursor-trail';

export function initCursorEffects() {
  const layers = [
    'linen-cursor',
    'linen-cursor-glass',
    'linen-prism-light',
  ].map((className) => {
    const layer = document.createElement('span');
    layer.className = className;
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
    return layer;
  });
  let paused = false;
  let reset = () => {};
  const media = gsap.matchMedia();
  media.add(
    '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)',
    () => {
      const trail = createCursorTrail();
      const text = createCursorText(layers.slice(0, 2));
      const events = new AbortController();
      const options = { signal: events.signal };
      let entered = false;
      const moveX = gsap.quickTo(layers, 'x', {
        duration: 0.12,
        ease: 'power3.out',
      });
      const moveY = gsap.quickTo(layers, 'y', {
        duration: 0.12,
        ease: 'power3.out',
      });
      function leave() {
        entered = false;
        trail.clear();
        text.clear();
        layers.forEach((layer) =>
          layer.classList.remove('is-visible', 'is-link', 'is-clickable-arrow'),
        );
      }
      reset = leave;
      function updatePointer(event) {
        if (paused || event.pointerType === 'touch') return;
        gsap.ticker.wake();
        const x = event.clientX;
        const y = event.clientY;
        if (!entered) {
          gsap.set(layers, { x, y });
          entered = true;
        }
        moveX(x);
        moveY(y);
        const exposedBackground = !event.target.closest(
          '.prism-card, .exploration-hero, .v2-footer, .exploration-header',
        );
        trail.add(x, y, exposedBackground);
        text.update(event.target);
        const clickable = Boolean(
          event.target.closest(
            'a[href], button:not(:disabled), summary, label[for], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [role="button"]:not([aria-disabled="true"])',
          ),
        );
        layers.forEach((layer) => {
          layer.classList.add('is-visible');
          layer.classList.toggle('is-clickable-arrow', clickable);
          layer.classList.toggle('is-link', clickable);
        });
      }
      const pointerOptions = { ...options, capture: true };
      document.addEventListener('pointerover', updatePointer, pointerOptions);
      document.addEventListener('pointermove', updatePointer, pointerOptions);
      document.addEventListener('pointerleave', leave, options);
      document.addEventListener('pointercancel', leave, options);
      window.addEventListener('blur', leave, options);
      window.addEventListener('scroll', () => text.clear(), {
        ...options,
        passive: true,
      });
      document.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Tab') leave();
        },
        options,
      );
      return () => {
        events.abort();
        leave();
        trail.destroy();
        reset = () => {};
      };
    },
  );
  return {
    setPaused(value) {
      paused = value;
      reset();
    },
  };
}
