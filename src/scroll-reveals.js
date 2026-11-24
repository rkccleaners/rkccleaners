import { startOpeningWipe } from './opening-wipe.js';

function createRevealLetters(heading) {
  const letters = document.createElement('span');
  letters.setAttribute('aria-hidden', 'true');
  let index = 0;

  for (const node of heading.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE) {
      letters.append(node.cloneNode(true));
      continue;
    }

    for (const character of node.textContent) {
      if (/\s/.test(character)) {
        letters.append(character);
        continue;
      }
      const letter = document.createElement('span');
      letter.className = 'reveal-letter';
      letter.style.setProperty('--letter-index', index);
      letter.textContent = character;
      letters.append(letter);
      index += 1;
    }
  }

  return letters;
}

export function initOpeningScreen(tagline) {
  const root = document.documentElement;
  if (!root.classList.contains('has-opening-screen')) return;

  const screen = document.querySelector('.opening-screen');
  const line = screen.querySelector('p');
  const listeners = new AbortController();
  const options = { signal: listeners.signal };

  function dismiss() {
    listeners.abort();
    root.classList.remove('has-opening-screen');
    screen.remove();
  }

  if (window.scrollY > 0) {
    dismiss();
    return;
  }

  line.textContent = tagline.textContent.trim();
  const lettering = createRevealLetters(line);
  line.replaceChildren(lettering);

  function positionLine() {
    if (listeners.signal.aborted) return;
    const { left, top, width } = tagline.getBoundingClientRect();
    line.style.left = `${left}px`;
    line.style.top = `${top}px`;
    line.style.width = `${width}px`;
  }

  positionLine();
  document.fonts.ready.then(positionLine);
  window.addEventListener('resize', positionLine, options);

  for (const eventName of ['animationend', 'animationcancel']) {
    screen.addEventListener(
      eventName,
      (event) => {
        if (event.target === screen) dismiss();
      },
      options,
    );
  }
  window.addEventListener('keydown', dismiss, options);
  window.addEventListener('wheel', dismiss, { ...options, passive: true });
  screen.addEventListener('pointerdown', dismiss, options);
  startOpeningWipe(screen, listeners.signal);
}

export function initScrollReveals() {
  if (
    !('IntersectionObserver' in window) ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.15 },
  );

  for (const heading of document.querySelectorAll(
    '.page-band h1, main h2:not(.eyebrow), .footer-tagline',
  )) {
    const readableText = document.createElement('span');
    readableText.className = 'sr-only';
    readableText.textContent = heading.innerText.replace(/\s+/g, ' ').trim();
    heading.replaceChildren(readableText, createRevealLetters(heading));
    heading.classList.add('reveal-title');
    observer.observe(heading);
  }

  const fadeTargets = [
    '.header-inner',
    'main :is(.eyebrow, .hero-copy h1, .hero-description, .hero-copy .contact-cta, .hero-ribbon li)',
    'main :is(.service h3, .service p, .interior-copy p, .interior-copy .button, img, .image-placeholder)',
    'main :is(.testimonial-grid figure, .contact-grid > div p, .contact-details, .contact-grid form)',
    '.site-footer :is(.footer-columns > *, .footer-bottom)',
  ];

  for (const element of document.querySelectorAll(fadeTargets.join(', '))) {
    element.classList.add('reveal-fade');
    observer.observe(element);
  }
}
