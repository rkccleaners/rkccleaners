import { initBentoLights } from '../exploration/v2/src/bento-lights.js';
import { initHeaderMenu } from '../exploration/v2/src/header-menu.js';
import { initLinenScene } from '../exploration/v2/src/linen-scene.js';
import { initQualityRide } from './quality-ride.js';
import { initOpeningScreen, initScrollReveals } from './scroll-reveals.js';

const header = document.querySelector('.site-header');
const hero = document.querySelector('.hero');
initHeaderMenu(header, '(width <= 56rem), (hover: none)');

const servicesMenu = header.querySelector('.services-menu');
const servicesSummary = servicesMenu.querySelector('summary');
const desktopServices = matchMedia('(width > 56rem) and (hover: hover)');

servicesMenu.addEventListener('pointerenter', (event) => {
  if (desktopServices.matches && event.pointerType === 'mouse') {
    servicesMenu.open = true;
  }
});
servicesMenu.addEventListener('pointerleave', (event) => {
  if (
    event.pointerType === 'mouse' &&
    !servicesMenu.querySelector(':focus-visible')
  ) {
    servicesMenu.open = false;
  }
});
servicesSummary.addEventListener('click', (event) => {
  if (
    desktopServices.matches &&
    event.pointerType === 'mouse' &&
    servicesMenu.open
  ) {
    event.preventDefault();
  }
});
servicesMenu.addEventListener('click', (event) => {
  if (event.target.closest('a')) servicesMenu.open = false;
});
servicesMenu.addEventListener('focusout', (event) => {
  if (!servicesMenu.contains(event.relatedTarget)) servicesMenu.open = false;
});
servicesMenu.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !servicesMenu.open) return;
  event.preventDefault();
  event.stopPropagation();
  servicesMenu.open = false;
  servicesSummary.focus();
});
desktopServices.addEventListener('change', () => {
  servicesMenu.open = false;
});

new IntersectionObserver(
  ([entry]) => {
    header.classList.toggle('is-at-footer', entry.intersectionRatio >= 0.12);
  },
  { threshold: 0.12 },
).observe(document.querySelector('.site-footer'));

const contactForm = document.querySelector(
  'form[aria-describedby="form-note"]',
);
const formStatus = document.querySelector('#form-status');

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  formStatus.textContent =
    'Your inquiry is ready. This prototype does not send messages.';
});

if (hero) {
  initOpeningScreen(hero.querySelector('.eyebrow'));
  const linenLayer = hero.querySelector('.hero-linen-layer');
  const heroIntro = hero.querySelector('.hero-intro');
  if (!CSS.supports('animation-timeline: scroll()')) {
    const desktopMotion = matchMedia(
      '(width > 760px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    const layers = [linenLayer, heroIntro.querySelector('.hero-grid')].map(
      (element) => ({
        element,
        rate: parseFloat(
          getComputedStyle(element).getPropertyValue('--hero-parallax-rate'),
        ),
      }),
    );
    let headerHeight = header.offsetHeight;
    let viewportHeight = window.innerHeight;
    let frame = 0;
    let previousOffset = 0;

    function updateParallax() {
      frame = 0;
      const offset = desktopMotion.matches
        ? Math.max(0, Math.min(window.scrollY, viewportHeight - headerHeight))
        : 0;
      if (offset === previousOffset) return;
      previousOffset = offset;
      for (const { element, rate } of layers) {
        element.style.transform = offset
          ? `translateY(${offset * rate}px)`
          : '';
      }
    }

    function scheduleParallax() {
      if (!frame) frame = requestAnimationFrame(updateParallax);
    }

    window.addEventListener('scroll', scheduleParallax, { passive: true });
    window.addEventListener('resize', () => {
      headerHeight = header.offsetHeight;
      viewportHeight = window.innerHeight;
      scheduleParallax();
    });
    desktopMotion.addEventListener('change', scheduleParallax);
    scheduleParallax();
  }

  const stackedHero = matchMedia('(max-width: 760px)');
  const heroStyles = getComputedStyle(hero);
  const glassTopEdge =
    parseFloat(heroStyles.getPropertyValue('--glass-top-edge')) / 100;
  const glassBottomEdge =
    parseFloat(heroStyles.getPropertyValue('--glass-bottom-edge')) / 100;

  initLinenScene({
    canvas: linenLayer.querySelector('canvas'),
    region: hero,
    columns: 32,
    rows: 40,
    pixelRatioLimit: 1.5,
    canPush({ clientX, clientY }) {
      const { top, bottom, height } = heroIntro.getBoundingClientRect();
      if (clientY >= bottom) return true;
      if (stackedHero.matches) return false;

      const { left, width } = hero.getBoundingClientRect();
      const progress = (clientY - top) / height;
      const edge = glassTopEdge + (glassBottomEdge - glassTopEdge) * progress;
      return clientX >= left + width * edge;
    },
  });
}

const footerPanel = document.querySelector('.footer-panel');
initLinenScene({
  canvas: footerPanel.querySelector('canvas'),
  region: footerPanel,
});

initBentoLights('.hero, .image-placeholder', '.hero-ribbon');

initScrollReveals();

initQualityRide(document.querySelector('.quality-ride'));
