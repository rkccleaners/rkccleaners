import { gsap } from 'gsap';

export function initBentoLights(
  selector = '.hero-note, .service-item, .static-reviews .review-card, #partners, #why-us > .section-inner',
  ignoreSelector,
) {
  const cards = document.querySelectorAll(selector);
  cards.forEach((card) => card.classList.add('prism-card'));
  let active = null;
  let paused = false;
  const clear = () => {
    if (active) {
      active.classList.remove('is-prism-lit');
    }
    active = null;
  };
  const media = gsap.matchMedia();
  media.add(
    '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)',
    () => {
      const events = new AbortController();
      const options = { signal: events.signal };
      const reflections = new Map();
      document.addEventListener(
        'pointermove',
        (event) => {
          if (paused || event.pointerType === 'touch') return;
          if (ignoreSelector && event.target.closest(ignoreSelector)) {
            clear();
            return;
          }
          const card = event.target.closest('.prism-card');
          if (card !== active) {
            clear();
            active = card;
          }
          const surface =
            active ||
            event.target
              .closest('.exploration-hero')
              ?.querySelector('.hero-bento-frame');
          if (!surface) return;
          const bounds = surface.getBoundingClientRect();
          const x = event.clientX - bounds.left;
          const y = event.clientY - bounds.top;
          surface.style.setProperty('--prism-x', `${x}px`);
          surface.style.setProperty('--prism-y', `${y}px`);
          if (!reflections.has(surface)) {
            gsap.set(surface, { '--rim-x': `${x}px`, '--rim-y': `${y}px` });
            reflections.set(surface, {
              x: gsap.quickTo(surface, '--rim-x', {
                duration: 0.9,
                ease: 'power3.out',
              }),
              y: gsap.quickTo(surface, '--rim-y', {
                duration: 0.9,
                ease: 'power3.out',
              }),
            });
          }
          const reflection = reflections.get(surface);
          reflection.x(x);
          reflection.y(y);
          const distance = Math.max(
            0,
            Math.min(x, y, bounds.width - x, bounds.height - y),
          );
          const reach = Math.min(
            110,
            Math.min(bounds.width, bounds.height) * 0.45,
          );
          const proximity = Math.max(0, 1 - distance / reach);
          surface.style.setProperty(
            '--rim-strength',
            `${0.65 + proximity * proximity * 0.35}`,
          );
          surface.style.setProperty(
            '--rim-radius',
            `${Math.max(280, Math.min(600, Math.min(bounds.width, bounds.height) * 1.4))}px`,
          );
          if (active) {
            active.classList.add('is-prism-lit');
          }
        },
        options,
      );
      document.addEventListener('pointerleave', clear, options);
      window.addEventListener('blur', clear, options);
      return () => {
        events.abort();
        reflections.forEach(({ x, y }) => {
          x.tween.kill();
          y.tween.kill();
        });
        clear();
      };
    },
  );
  return {
    setPaused(value) {
      paused = value;
      if (paused) clear();
    },
  };
}
