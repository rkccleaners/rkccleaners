import './v2.css';
import { gsap } from 'gsap';
import { initFaqMotion } from './faq-motion';
import { initServiceMedia } from './service-media';
import { initBentoLights } from './bento-lights';
import { initCursorEffects } from './cursor-effects';
import { initLinenScene } from './linen-scene.js';
import { initHeaderMenu } from './header-menu';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
initServiceMedia();
initFaqMotion();
document.fonts.ready.then(() => ScrollTrigger.refresh());
const hero = document.querySelector('.exploration-hero');
const header = document.querySelector('.exploration-header');
const heroFrame = document.createElement('span');
heroFrame.className = 'hero-bento-frame';
heroFrame.setAttribute('aria-hidden', 'true');
hero.append(heroFrame);
initHeaderMenu(header);
const headerObserver = new IntersectionObserver(
  ([entry]) => {
    header.classList.toggle('is-at-home', entry.isIntersecting);
  },
  { threshold: 0.2 },
);
headerObserver.observe(hero);
const footerHeaderObserver = new IntersectionObserver(([entry]) => {
  header.classList.toggle('is-at-footer', entry.isIntersecting);
  if (
    entry.isIntersecting &&
    matchMedia('(max-width: 767px), (hover: none)').matches
  ) {
    header.querySelector('.header-menu').setAttribute('aria-expanded', 'false');
    header.querySelector('.header-menu-label').textContent = 'Menu';
  }
});
footerHeaderObserver.observe(document.querySelector('.v2-footer'));
const heroMotion = gsap.matchMedia();
heroMotion.add('(prefers-reduced-motion: no-preference)', () => {
  const partnersTrack = document.querySelector('.partners-track');
  const partnerCopy = partnersTrack.querySelector('ul').cloneNode(true);
  partnerCopy.setAttribute('aria-hidden', 'true');
  partnerCopy.inert = true;
  partnersTrack.append(partnerCopy);
  const copy = hero.querySelector('.linen-copy');
  const fabric = hero.querySelector('.linen-scene');
  const title = hero.querySelector('#hero-title');
  const sideInset = () =>
    Math.min(64, Math.max(20, document.documentElement.clientWidth * 0.04));
  const bentoRadius = () =>
    parseFloat(
      getComputedStyle(document.body).getPropertyValue('--radius-bento'),
    );
  const frameWidth = () =>
    document.documentElement.clientWidth - sideInset() * 2;
  const topInset = () =>
    parseFloat(getComputedStyle(document.body).getPropertyValue('--bento-gap'));
  const bottomInset = () => hero.clientHeight * 0.16;
  gsap
    .timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: '+=300',
        pin: true,
        anticipatePin: 1,
        scrub: true,
        invalidateOnRefresh: true,
      },
    })
    .fromTo(
      hero,
      { clipPath: 'inset(0px 0px round 0px)' },
      {
        clipPath: () =>
          `inset(${topInset()}px ${sideInset()}px ${bottomInset()}px round ${bentoRadius()}px)`,
        ease: 'none',
        duration: 1,
      },
      0,
    )
    .fromTo(
      heroFrame,
      { top: 0, right: 0, bottom: 0, left: 0, opacity: 0, borderRadius: 0 },
      {
        top: topInset,
        right: sideInset,
        bottom: bottomInset,
        left: sideInset,
        opacity: 1,
        borderRadius: bentoRadius,
        duration: 1,
        ease: 'none',
      },
      0,
    )
    .fromTo(
      fabric,
      { scale: 1, y: 0, transformOrigin: 'center center' },
      {
        scale: () =>
          Math.min(
            frameWidth() / hero.clientWidth,
            (hero.clientHeight - topInset() - bottomInset()) /
              hero.clientHeight,
          ),
        y: () => (topInset() - bottomInset()) / 2,
        ease: 'none',
        duration: 1,
      },
      0,
    )
    .fromTo(
      copy,
      { scale: 1, x: 0, y: 0, transformOrigin: 'top left' },
      {
        scale: 0.88,
        x: () => sideInset() + 32 - copy.offsetLeft,
        y: () =>
          hero.clientHeight -
          bottomInset() -
          32 -
          title.offsetHeight * 0.88 -
          copy.offsetTop -
          parseFloat(getComputedStyle(copy).paddingTop) * 0.88,
        ease: 'none',
        duration: 1,
      },
      0,
    )
    .fromTo(
      hero.querySelectorAll('.linen-eyebrow, .linen-link'),
      { autoAlpha: 1, y: 0 },
      { autoAlpha: 0, y: -12, duration: 0.4, ease: 'none' },
      0,
    )
    .fromTo(
      title,
      { y: 0 },
      {
        y: () =>
          parseFloat(getComputedStyle(copy).paddingTop) - title.offsetTop,
        duration: 1,
        ease: 'none',
      },
      0,
    )
    .fromTo(
      document.querySelector('.hero-notes'),
      { '--hero-bottom-trim': '0px' },
      {
        '--hero-bottom-trim': () => `${bottomInset()}px`,
        duration: 1,
        ease: 'none',
      },
      0,
    );
  const why = document.querySelector('#why-us');
  const reasons = [...why.querySelectorAll('.reason-card')];
  why.classList.add('is-reason-sequence');
  gsap.set(reasons.slice(1), { autoAlpha: 0 });
  const reasonSequence = gsap.timeline({
    scrollTrigger: {
      trigger: why,
      start: 'center center',
      end: () => `+=${window.innerHeight * 2}`,
      pin: true,
      scrub: 0.65,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
    onUpdate: () =>
      reasons.forEach((reason) => {
        reason.setAttribute(
          'aria-hidden',
          String(gsap.getProperty(reason, 'opacity') < 0.5),
        );
      }),
  });
  reasonSequence.to({}, { duration: 0.6 });
  reasons.slice(1).forEach((reason, index) => {
    reasonSequence
      .to(reasons[index], { autoAlpha: 0, duration: 0.3, ease: 'power1.inOut' })
      .fromTo(
        reason,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power1.out' },
        '>-0.05',
      )
      .to({}, { duration: 0.6 });
  });
  for (const group of document.querySelectorAll(
    '.hero-notes, .services-grid, .static-reviews',
  )) {
    gsap.from(group.children, {
      y: 12,
      autoAlpha: 0,
      clearProps: 'transform',
      duration: 0.7,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: group,
        start: 'top 92%',
        once: true,
      },
    });
  }
  for (const heading of document.querySelectorAll(
    'section:not(#why-us) .section-heading',
  )) {
    gsap.from(heading, {
      autoAlpha: 0,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: heading, start: 'top 94%', once: true },
    });
  }
  const closingFooter = document.querySelector('.v2-footer');
  const footerSequence = gsap.timeline({
    scrollTrigger: {
      trigger: '.footer-stage',
      start: 'bottom bottom',
      end: '+=360',
      pin: true,
      anticipatePin: 1,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  footerSequence.fromTo(
    closingFooter,
    {
      clipPath: () => `inset(0px ${sideInset()}px round ${bentoRadius()}px)`,
      paddingLeft: () => sideInset() + 32,
      paddingRight: () => sideInset() + 32,
    },
    {
      clipPath: 'inset(0px 0px round 0px)',
      paddingLeft: sideInset,
      paddingRight: sideInset,
      duration: 1,
      ease: 'none',
    },
  );
  gsap.fromTo(
    '.footer-tagline',
    { autoAlpha: 0, y: 16 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 0.45,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.footer-tagline',
        start: 'top 80%',
        once: true,
      },
    },
  );
  return () => {
    partnerCopy.remove();
    why.classList.remove('is-reason-sequence');
    reasons.forEach((reason) => reason.removeAttribute('aria-hidden'));
  };
});

const footer = document.querySelector('.v2-footer');
const cursorEffects = initCursorEffects();
const bentoLights = initBentoLights();

initLinenScene({
  canvas: hero.querySelector('.linen-scene'),
  region: hero,
  mirror: footer.querySelector('canvas'),
  mirrorRegion: footer,
  onPlaybackChange(paused) {
    cursorEffects.setPaused(paused);
    bentoLights.setPaused(paused);
  },
});
