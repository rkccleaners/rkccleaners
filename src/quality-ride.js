import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function initQualityRide(ride) {
  if (!ride) return;

  const controls = ride.querySelector('.ride-controls');
  const stops = [...controls.querySelectorAll('button[aria-pressed]')];
  const panels = [...ride.querySelectorAll('.ride-panel')];
  const images = [...ride.querySelectorAll('.ride-image')];
  const scenes = [...ride.querySelectorAll('.ride-location')];
  const cargo = [...ride.querySelectorAll('.cargo-item')];
  let active = -1;
  let driving;
  let motionTimer;

  function pauseMotion() {
    clearTimeout(motionTimer);
    ride.classList.remove('is-running');
  }

  function runMotion() {
    if (!ride.classList.contains('is-in-view')) return;

    clearTimeout(motionTimer);
    ride.classList.add('is-running');
    motionTimer = setTimeout(pauseMotion, 3000);
  }

  function showStop(index) {
    if (active === index) return;
    if (active >= 0) {
      ride.classList.add('has-scene-transition');
      ride.style.setProperty('--ride-direction', index > active ? 1 : -1);
    }
    ride.style.setProperty('--ride-progress', index / (stops.length - 1));

    stops.forEach((button, position) => {
      const current = index === position;
      button.setAttribute('aria-pressed', String(current));
      panels[position].inert = !current;
      panels[position].classList.toggle('is-current', current);
      images[position].classList.toggle('is-current', current);
      scenes[position].classList.toggle('is-current', current);
      scenes[position].classList.toggle('is-leaving', position === active);
      cargo[position].classList.toggle('is-current', current);
    });

    if (active >= 0) {
      ride.classList.add('is-driving');
      clearTimeout(driving);
      driving = setTimeout(() => ride.classList.remove('is-driving'), 550);
    }
    active = index;
    runMotion();
  }

  ride.classList.add('is-ready');
  ride.querySelector('.ride-panels').classList.add('is-interactive');
  showStop(0);
  controls.hidden = false;

  new IntersectionObserver(
    ([entry]) => {
      const visible = entry.intersectionRatio >= 0.35;
      ride.classList.toggle('is-in-view', visible);
      if (visible) runMotion();
      else pauseMotion();
    },
    { threshold: 0.35 },
  ).observe(ride.querySelector('.ride-landscape'));

  ride.addEventListener('animationend', (event) => {
    if (event.animationName === 'ride-scene-leave') {
      event.target.classList.remove('is-leaving');
    }
  });

  controls.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    const index = stops.indexOf(button);
    if (index < 0) return;
    showStop(index);
    if (ride.classList.contains('is-scroll-driven')) {
      const image = images[index].getBoundingClientRect();
      window.scrollTo({
        top:
          window.scrollY +
          image.top +
          image.height / 2 -
          window.innerHeight * 0.58,
        behavior: 'instant',
      });
    }
  });

  gsap.registerPlugin(ScrollTrigger);
  gsap
    .matchMedia()
    .add(
      '(min-width: 761px) and (min-height: 720px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      () => {
        ride.classList.add('is-scroll-driven');
        images.forEach((image, index) => {
          const nextImage = images[index + 1];
          ScrollTrigger.create({
            trigger: image,
            start: 'top 58%',
            endTrigger: nextImage ?? ride,
            end: nextImage ? 'top 58%' : 'bottom 58%',
            onToggle: ({ isActive }) => {
              if (isActive) showStop(index);
            },
          });
        });

        return () => ride.classList.remove('is-scroll-driven');
      },
    );
}
