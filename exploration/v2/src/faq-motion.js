import { gsap } from 'gsap';

export function initFaqMotion() {
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    const events = new AbortController();
    const cleanups = [];
    document.querySelectorAll('.faq-list details').forEach((details) => {
      const summary = details.querySelector('summary');
      let expanded = details.open;
      let animation = null;
      const reset = () => {
        details.open = expanded;
        details.style.removeProperty('height');
        details.style.removeProperty('overflow');
      };
      summary.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          const from = details.getBoundingClientRect().height;
          animation?.cancel();
          expanded = !expanded;
          details.open = true;
          details.style.removeProperty('height');
          const fullHeight = details.getBoundingClientRect().height;
          const border =
            parseFloat(getComputedStyle(details).borderTopWidth) +
            parseFloat(getComputedStyle(details).borderBottomWidth);
          const to = expanded
            ? fullHeight
            : summary.getBoundingClientRect().height + border;
          details.style.overflow = 'hidden';
          animation = details.animate(
            { height: [`${from}px`, `${to}px`] },
            {
              duration: 380,
              easing: 'cubic-bezier(.22, 1, .36, 1)',
            },
          );
          animation.onfinish = () => {
            reset();
            animation = null;
          };
        },
        { signal: events.signal },
      );
      cleanups.push(() => {
        animation?.cancel();
        reset();
      });
    });
    return () => {
      events.abort();
      cleanups.forEach((cleanup) => cleanup());
    };
  });
}
