import { gsap } from 'gsap';

export function initServiceMedia() {
  const media = gsap.matchMedia();
  media.add(
    '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)',
    () => {
      const events = new AbortController();
      const stops = [];
      const cleanups = [];
      document.querySelectorAll('.service-with-media').forEach((card) => {
        const video = card.querySelector('video');
        cleanups.push(() => {
          gsap.killTweensOf(video);
          gsap.set(video, { clearProps: 'transform' });
        });
        let hovering = false;
        const stop = () => {
          hovering = false;
          video.pause();
          card.classList.remove('is-media-playing');
          gsap.to(video, {
            scale: 1,
            duration: 0.6,
            overwrite: true,
          });
        };
        stops.push(stop);
        card.addEventListener(
          'pointerenter',
          async () => {
            hovering = true;
            video.muted = true;
            gsap.to(video, {
              scale: 1.04,
              duration: 0.8,
              ease: 'power2.out',
              overwrite: true,
            });
            try {
              video.currentTime = 0;
              await video.play();
              if (hovering && !document.hidden)
                card.classList.add('is-media-playing');
              else video.pause();
            } catch {
              stop();
            }
          },
          { signal: events.signal },
        );
        card.addEventListener('pointerleave', stop, {
          signal: events.signal,
        });
        card.addEventListener('pointercancel', stop, {
          signal: events.signal,
        });
      });
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) stops.forEach((stop) => stop());
        },
        { signal: events.signal },
      );
      return () => {
        events.abort();
        stops.forEach((stop) => stop());
        cleanups.forEach((cleanup) => cleanup());
      };
    },
  );
}
