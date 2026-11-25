import { gsap } from 'gsap';

export function createCursorTrail() {
  const canvas = document.createElement('canvas');
  canvas.className = 'linen-trail';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const context = canvas.getContext('2d');
  const cleaningCanvas = document.createElement('canvas');
  cleaningCanvas.className = 'linen-clean-trail';
  cleaningCanvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(cleaningCanvas);
  const cleaning = cleaningCanvas.getContext('2d');
  const cleaned = [];
  let continuing = false;
  const points = [];
  let width = 0;
  let height = 0;
  const lifetime = 650;
  const resize = new ResizeObserver(() => {
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    cleaningCanvas.width = canvas.width;
    cleaningCanvas.height = canvas.height;
    cleaning.setTransform(ratio, 0, 0, ratio, 0, 0);
    cleaned.length = 0;
    continuing = false;
    points.length = 0;
  });
  resize.observe(document.documentElement);

  function draw() {
    const now = performance.now();
    while (points.length && now - points[0].time > lifetime) points.shift();
    while (cleaned.length && now - cleaned[0].time > 3200) cleaned.shift();
    cleaning.clearRect(0, 0, width, height);
    cleaning.lineCap = 'round';
    cleaning.lineJoin = 'round';
    for (let i = 1; i < cleaned.length; i += 1) {
      const a = cleaned[i - 1];
      const b = cleaned[i];
      if (b.start) continue;
      const remaining = Math.max(0, 1 - (now - a.time) / 3200);
      cleaning.lineWidth = 105;
      cleaning.strokeStyle = `rgba(255, 250, 241, ${remaining ** 1.5 * 0.3})`;
      cleaning.beginPath();
      cleaning.moveTo(a.x - window.scrollX, a.y - window.scrollY);
      cleaning.lineTo(b.x - window.scrollX, b.y - window.scrollY);
      cleaning.stroke();
    }
    document
      .querySelectorAll(
        '.prism-card, .exploration-hero, .v2-footer, .exploration-header',
      )
      .forEach((element) => {
        const bounds = element.getBoundingClientRect();
        cleaning.clearRect(
          bounds.left - 10,
          bounds.top - 10,
          bounds.width + 20,
          bounds.height + 20,
        );
      });
    context.clearRect(0, 0, width, height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const remaining = Math.max(0, 1 - (now - a.time) / lifetime);
      context.lineWidth = 2 + 70 * remaining ** 1.5;
      context.strokeStyle = `rgba(255, 255, 255, ${remaining * 0.3})`;
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }
  }
  const breakCleaningStroke = () => {
    continuing = false;
  };
  window.addEventListener('scroll', breakCleaningStroke, { passive: true });
  gsap.ticker.add(draw);
  return {
    add(x, y, clean = false) {
      gsap.ticker.wake();
      if (clean) {
        const pageX = x + window.scrollX;
        const pageY = y + window.scrollY;
        const lastCleaned = cleaned.at(-1);
        if (
          !continuing ||
          !lastCleaned ||
          Math.hypot(pageX - lastCleaned.x, pageY - lastCleaned.y) >= 8
        ) {
          cleaned.push({
            x: pageX,
            y: pageY,
            time: performance.now(),
            start: !continuing,
          });
          if (cleaned.length > 160) cleaned.shift();
        }
      }
      continuing = clean;
      const last = points.at(-1);
      if (last && Math.hypot(x - last.x, y - last.y) < 6) return;
      points.push({ x, y, time: performance.now() });
      if (points.length > 48) points.shift();
    },
    clear() {
      points.length = 0;
      cleaned.length = 0;
      continuing = false;
      cleaning.clearRect(0, 0, width, height);
      context.clearRect(0, 0, width, height);
    },
    destroy() {
      gsap.ticker.remove(draw);
      resize.disconnect();
      window.removeEventListener('scroll', breakCleaningStroke);
      canvas.remove();
      cleaningCanvas.remove();
    },
  };
}
