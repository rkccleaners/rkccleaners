import './v2.css';
import { gsap } from 'gsap';
import { initFaqMotion } from './faq-motion';
import { initServiceMedia } from './service-media';
import { initBentoLights } from './bento-lights';
import { initCursorEffects } from './cursor-effects';
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

const canvas = document.querySelector('.linen-scene');
const context = canvas.getContext('2d');
const footer = document.querySelector('.v2-footer');
const footerCanvas = footer.querySelector('canvas');
const footerContext = footerCanvas.getContext('2d');
let footerVisible = false;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const columns = 64;
const rows = 80;
const lines = [{ depth: 0, top: -220, speed: 18, spacing: 300, length: 850 }];
let width = 0;
let height = 0;
let time = 0;
let previousFrame = 0;
let frame = 0;
let paused = reducedMotion.matches;
const cursorEffects = initCursorEffects();
const bentoLights = initBentoLights();
const pointer = { x: 0, y: 0, clientX: null, clientY: null, active: false };
const surfaces = [];
const clothMotion = new Map();
const motionColumns = 12;
const motionRows = 18;

function motionFor(id) {
  if (!clothMotion.has(id)) {
    clothMotion.set(
      id,
      Array.from({ length: (motionColumns + 1) * (motionRows + 1) }, () => ({
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
      })),
    );
  }
  return clothMotion.get(id);
}

function advanceCloth(elapsed) {
  // Small integration steps keep tension and gravity stable after slow frames.
  const steps = Math.ceil(elapsed / (1 / 120));
  if (!steps) return;
  const dt = elapsed / steps;
  for (let step = 0; step < steps; step += 1) {
    for (const nodes of clothMotion.values()) {
      for (let row = 1; row <= motionRows; row += 1) {
        for (let column = 0; column <= motionColumns; column += 1) {
          const node = nodes[row * (motionColumns + 1) + column];
          const neighbors = [nodes[(row - 1) * (motionColumns + 1) + column]];
          if (row < motionRows)
            neighbors.push(nodes[(row + 1) * (motionColumns + 1) + column]);
          if (column)
            neighbors.push(nodes[row * (motionColumns + 1) + column - 1]);
          if (column < motionColumns)
            neighbors.push(nodes[row * (motionColumns + 1) + column + 1]);
          // The hem has no tether to its starting position; only the top is pinned.
          const free = row / motionRows;
          const restoring = 8 * (1 - free) ** 2;
          const drag = 9 - free * 3;
          for (const axis of ['x', 'z']) {
            const tension = neighbors.reduce(
              (sum, neighbor) => sum + neighbor[axis] - node[axis],
              0,
            );
            node[`v${axis}`] +=
              (tension * 35 -
                node[axis] * restoring -
                node[`v${axis}`] * drag) *
              dt;
          }
        }
      }
      for (const node of nodes) {
        node.x += node.vx * dt;
        node.z += node.vz * dt;
      }
    }
  }
}

function clothDisplacement(id, u, v) {
  const nodes = motionFor(id);
  const x = u * motionColumns;
  const y = v * motionRows;
  const column = Math.min(motionColumns - 1, Math.floor(x));
  const row = Math.min(motionRows - 1, Math.floor(y));
  // Cubic interpolation keeps slopes continuous across the coarse physics grid.
  const cubic = (a, b, c, d, t) =>
    b +
    0.5 *
      t *
      (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
  const sample = (column, row, axis) =>
    nodes[
      Math.max(0, Math.min(motionRows, row)) * (motionColumns + 1) +
        Math.max(0, Math.min(motionColumns, column))
    ][axis];
  const result = { x: 0, z: 0 };
  for (const axis of ['x', 'z']) {
    const values = [];
    for (let offset = -1; offset <= 2; offset += 1) {
      values.push(
        cubic(
          sample(column - 1, row + offset, axis),
          sample(column, row + offset, axis),
          sample(column + 1, row + offset, axis),
          sample(column + 2, row + offset, axis),
          x - column,
        ),
      );
    }
    result[axis] = cubic(...values, y - row);
  }
  return result;
}

function project(x, y, z) {
  const scale =
    (Math.max(width, height * 2.1, 950) / 1450) * (1100 / (1100 + z));
  return { x: width / 2 + x * scale, y: height * 0.29 + y * scale };
}

function ropeHeight(x, line) {
  return line.top + 42 * (1 - (x / 1400) ** 2) + x * 0.025;
}

function clothPoint(u, v, left, line, phase, id) {
  const x = left + u * 275;
  const loose = v ** 0.8;
  const wave = Math.sin(u * 9 + v * 5 - time * 1.0 + phase);
  const fold = Math.sin(u * 22 - v * 3 + time * 0.45 + phase);
  const breeze = Math.sin(time * 0.4 + phase);
  const drape = Math.sin(u * 9 + phase) * 19;
  const creases = Math.sin(u * 25 + v * 4 + phase) * 2;
  const wrinkles = Math.sin(u * 57 - v * 12 + phase) * 0.5;
  const z =
    line.depth +
    loose * (drape + creases + wrinkles + wave * 14 + fold * 3 + breeze * 18);
  const point = {
    x: x + v ** 1.7 * (breeze * 10 + wave * 3),
    y: ropeHeight(x, line) + v * line.length - loose * wave * 4,
    z,
  };
  const motion = clothDisplacement(id, u, v);
  point.x += motion.x;
  point.z += motion.z;
  // Sideways movement lifts hanging fabric; gravity pulls it back into its drape.
  const hangingLength = Math.max(30, v * line.length);
  point.y -= Math.min(
    hangingLength * 0.3,
    (motion.x ** 2 + motion.z ** 2) / (2 * hangingLength),
  );

  return point;
}

function drawCloth(left, line, phase, id) {
  const points = Array.from({ length: rows + 1 }, (_, row) =>
    Array.from({ length: columns + 1 }, (_, column) => {
      const point = clothPoint(
        column / columns,
        row / rows,
        left,
        line,
        phase,
        id,
      );
      return { ...point, screen: project(point.x, point.y, point.z) };
    }),
  );

  // Smooth shading across each narrow ribbon avoids a faceted mesh appearance.
  for (let row = 0; row < rows; row += 1) {
    const top = points[row];
    const bottom = points[row + 1];
    const gradient = context.createLinearGradient(
      top[0].screen.x,
      top[0].screen.y,
      top[columns].screen.x,
      top[columns].screen.y,
    );
    for (let column = 0; column <= columns; column += 1) {
      const a = top[Math.max(0, column - 1)];
      const b = top[Math.min(columns, column + 1)];
      const c = top[column];
      const d = bottom[column];
      const slopeX = (b.z - a.z) / (b.x - a.x);
      const above = points[Math.max(0, row - 1)][column];
      const slopeY = (d.z - above.z) / (d.y - above.y);
      const light = Math.max(
        0.08,
        (0.75 - slopeX * 0.65 - slopeY * 0.2) / Math.hypot(slopeX, slopeY, 1),
      );
      const position = Math.max(
        0,
        Math.min(1, (c.screen.x / width - 0.22) / 0.65),
      );
      const illumination = position * position * (3 - 2 * position);
      const across = c.screen.x / width;
      const down = c.screen.y / height;
      const leftPrism = Math.exp(
        -(((across + 0.04) / 0.32) ** 2) - ((down - 0.45) / 0.8) ** 2,
      );
      const rightPrism = Math.exp(
        -(((across - 1.04) / 0.35) ** 2) - ((down - 0.5) / 0.8) ** 2,
      );
      const weave = Math.sin(column * 17 + row * 11) * 0.8;
      const shade = Math.round(
        (0.98 + illumination * 0.02) * (230 + light * 20 + weave * 0.4),
      );
      gradient.addColorStop(
        column / columns,
        `rgb(${Math.min(255, shade + 3 + leftPrism * 17 + rightPrism * 6)} ${Math.min(255, shade + 1 + leftPrism * 9 + rightPrism * 12)} ${Math.min(255, shade - 1 + leftPrism * 4 + rightPrism * 22)})`,
      );
    }
    context.fillStyle = gradient;
    context.strokeStyle = gradient;
    context.lineWidth = 0.6;
    context.beginPath();
    [...top, ...bottom.toReversed()].forEach((point, index) => {
      const { x, y } = point.screen;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fill();
    context.stroke();
  }

  // Fine warp threads follow the deformed cloth instead of a screen overlay.
  context.lineWidth = 0.3;
  context.strokeStyle = 'rgb(112 110 104 / 4%)';
  for (let column = 2; column < columns; column += 3) {
    context.beginPath();
    points.forEach((row, index) => {
      const { x, y } = row[column].screen;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  }

  const edge = [
    ...points.map((row) => row[0]),
    ...points[rows].slice(1),
    ...points
      .slice(0, rows)
      .reverse()
      .map((row) => row[columns]),
  ];
  surfaces.push({ id, points, outline: edge.map((point) => point.screen) });

  for (const x of [left + 7, left + 268]) {
    const pin = project(x, ropeHeight(x, line), line.depth - 3);
    const size = line.depth ? 0.7 : 1;
    context.save();
    context.translate(pin.x, pin.y);
    context.rotate(-0.07);
    context.fillStyle = '#514d43';
    context.fillRect(-2 * size, -10 * size, 4 * size, 20 * size);
    context.fillStyle = '#706959';
    context.fillRect(-2 * size, -10 * size, 1.5 * size, 20 * size);
    context.restore();
  }
}

function draw() {
  context.clearRect(0, 0, width, height);
  surfaces.length = 0;
  for (const line of lines) {
    context.beginPath();
    for (let x = -1800; x <= 1800; x += 30) {
      const point = project(x, ropeHeight(x, line), line.depth);
      if (x === -1800) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.strokeStyle = '#46443f';
    context.lineWidth = line.depth ? 1 : 1.6;
    context.stroke();
    const offset = time * line.speed;
    const scale = project(1, 0, line.depth).x - project(0, 0, line.depth).x;
    const halfSpan = width / (2 * scale);
    const first = Math.floor((-halfSpan - 500 - offset) / line.spacing);
    const last = Math.ceil((halfSpan + 500 - offset) / line.spacing);
    // Generate incoming linens outside the viewport so the drift never resets.
    for (let index = first; index <= last; index += 1) {
      const left = index * line.spacing + offset - 137;
      const start = project(left - 80, 0, line.depth);
      const end = project(left + 355, 0, line.depth);
      if (end.x < 0 || start.x > width) continue;
      drawCloth(
        left,
        line,
        index * 1.8 + line.depth * 0.01,
        `${line.depth}:${index}`,
      );
    }
  }
  if (footerVisible && footerCanvas.width && footerCanvas.height) {
    footerContext.clearRect(0, 0, footerCanvas.width, footerCanvas.height);
    footerContext.drawImage(
      canvas,
      0,
      0,
      footerCanvas.width,
      footerCanvas.height,
    );
  }
  const visible = new Set(surfaces.map(({ id }) => id));
  for (const id of clothMotion.keys()) {
    if (!visible.has(id)) clothMotion.delete(id);
  }
}

function animate(now) {
  frame = 0;
  if (paused || document.hidden) return;
  if (previousFrame && now - previousFrame < 1000 / 30) {
    frame = requestAnimationFrame(animate);
    return;
  }
  // Cap long gaps so returning to the tab doesn't jump the fabric forward.
  const elapsed = previousFrame ? Math.min(now - previousFrame, 50) / 1000 : 0;
  time += elapsed;
  advanceCloth(elapsed);
  previousFrame = now;
  draw();
  frame = requestAnimationFrame(animate);
}

function ensureAnimation() {
  if (!paused && !document.hidden && !frame) {
    previousFrame = 0;
    frame = requestAnimationFrame(animate);
  }
}

function updatePlayback() {
  cursorEffects.setPaused(paused);
  bentoLights.setPaused(paused);
  cancelAnimationFrame(frame);
  frame = 0;
  previousFrame = 0;
  if (paused) {
    pointer.active = false;
    clothMotion.clear();
    if (width && height) draw();
  }
  ensureAnimation();
}

const resize = new ResizeObserver(() => {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
});
resize.observe(canvas);
const footerResize = new ResizeObserver(() => {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  footerCanvas.width = Math.round(footerCanvas.clientWidth * ratio);
  footerCanvas.height = Math.round(footerCanvas.clientHeight * ratio);
  if (width && height) draw();
});
footerResize.observe(footerCanvas);
new IntersectionObserver(([entry]) => {
  footerVisible = entry.isIntersecting;
  if (footerVisible && width && height) draw();
}).observe(footer);
reducedMotion.addEventListener('change', () => {
  paused = reducedMotion.matches;
  updatePlayback();
});
document.addEventListener('visibilitychange', updatePlayback);
window.addEventListener('pageshow', ensureAnimation);
hero.addEventListener('pointerenter', ensureAnimation);
updatePlayback();

function containsPoint(outline, x, y) {
  let inside = false;
  for (
    let current = 0, previous = outline.length - 1;
    current < outline.length;
    previous = current++
  ) {
    const a = outline[current];
    const b = outline[previous];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

function pushLinen(event) {
  ensureAnimation();
  if (paused || reducedMotion.matches) return;
  const dx =
    pointer.clientX === null
      ? event.movementX || 0
      : event.clientX - pointer.clientX;
  const dy =
    pointer.clientY === null
      ? event.movementY || 0
      : event.clientY - pointer.clientY;
  pointer.clientX = event.clientX;
  pointer.clientY = event.clientY;
  if (event.target?.closest('a, button')) return;
  // Convert through the live parallax transform back into the mesh's coordinates.
  const targetCanvas = event.currentTarget === footer ? footerCanvas : canvas;
  const bounds = targetCanvas.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) * width) / bounds.width;
  const y = ((event.clientY - bounds.top) * height) / bounds.height;
  const surface = surfaces.findLast(({ outline }) =>
    containsPoint(outline, x, y),
  );
  pointer.x = x;
  pointer.y = y;
  pointer.active = Boolean(surface);
  const speed = Math.hypot(dx, dy);
  if (!surface || speed < 0.1) return;
  const nodes = motionFor(surface.id);
  const scale = project(1, 0, 0).x - project(0, 0, 0).x;
  const impulse = Math.min(340, speed * 16) / scale;
  for (let row = 1; row <= motionRows; row += 1) {
    for (let column = 0; column <= motionColumns; column += 1) {
      const point =
        surface.points[Math.round((row / motionRows) * rows)][
          Math.round((column / motionColumns) * columns)
        ].screen;
      const distance = Math.hypot(point.x - x, point.y - y);
      const influence = Math.exp(-2 * (distance / 95) ** 2);
      const node = nodes[row * (motionColumns + 1) + column];
      node.vx = Math.max(
        -520,
        Math.min(520, node.vx + (dx / speed) * impulse * influence),
      );
      node.vz = Math.min(480, node.vz + impulse * influence * 0.8);
    }
  }
}
hero.addEventListener('pointermove', pushLinen);
footer.addEventListener('pointermove', pushLinen);

function clearPointer() {
  pointer.clientX = null;
  pointer.clientY = null;
  pointer.active = false;
}
hero.addEventListener('pointerleave', clearPointer);
footer.addEventListener('pointerleave', clearPointer);
footer.addEventListener('pointercancel', clearPointer);
hero.addEventListener('pointercancel', clearPointer);
hero.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch') clearPointer();
});
