import { gsap } from 'gsap';

export function createCursorText(layers) {
  let source = null;
  let ranges = [];
  let running = false;
  function clearMask() {
    layers.forEach((layer) => {
      layer.style.removeProperty('mask-image');
      layer.style.removeProperty('-webkit-mask-image');
    });
  }
  function clear() {
    source = null;
    ranges = [];
    if (running) gsap.ticker.remove(draw);
    running = false;
    clearMask();
  }
  function draw() {
    if (!source?.isConnected) {
      clear();
      return;
    }
    const rectangles = ranges.flatMap((range) => [...range.getClientRects()]);
    layers.forEach((layer) => {
      const bounds = layer.getBoundingClientRect();
      const overlapping = rectangles.filter(
        (rect) =>
          rect.right > bounds.left &&
          rect.left < bounds.right &&
          rect.bottom > bounds.top &&
          rect.top < bounds.bottom,
      );
      if (!overlapping.length) {
        layer.style.removeProperty('mask-image');
        layer.style.removeProperty('-webkit-mask-image');
        return;
      }
      // Cut the bubble away under real text, including moving carousel labels.
      const holes = overlapping
        .map(
          (rect) =>
            `<rect x="${rect.left - bounds.left - 1}" y="${rect.top - bounds.top}" width="${rect.width + 2}" height="${rect.height}" fill="black"/>`,
        )
        .join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}"><rect width="100%" height="100%" fill="white"/>${holes}</svg>`;
      const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      layer.style.maskImage = mask;
      layer.style.webkitMaskImage = mask;
    });
  }
  function update(target) {
    const text = target.closest(
      'h1, h2, h3, h4, p, a, button, summary, li, label, small, span, strong, em',
    );
    if (!text?.textContent.trim() || text.closest('[aria-hidden="true"]')) {
      clear();
      return;
    }
    if (source === text) return;
    source = text;
    ranges = [];
    const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      ranges.push(range);
    }
    if (!running) {
      running = true;
      gsap.ticker.add(draw);
    }
    draw();
  }
  return { update, clear };
}
