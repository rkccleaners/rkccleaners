function createClothStamp(width, height) {
  const stamp = document.createElement('canvas');
  const feather = Math.max(4, height * 0.025);
  stamp.width = Math.ceil(width + feather * 2);
  stamp.height = Math.ceil(height + feather * 2);
  const brush = stamp.getContext('2d');
  if (!brush) return null;

  brush.setTransform(width / 100, 0, 0, height / 100, feather, feather);
  brush.shadowColor = 'black';
  brush.shadowBlur = feather;
  const cloth = new Path2D(
    'M 4 9 Q 6 2 15 3 L 40 1 Q 66 5 85 2 L 94 5 Q 100 6 98 16 L 100 75 Q 98 84 97 92 Q 95 99 83 98 L 61 100 Q 35 96 15 99 L 6 95 Q 1 94 2 84 L 0 26 Q 2 16 4 9 Z',
  );
  brush.fill(cloth);
  return stamp;
}

export function startOpeningWipe(screen, signal) {
  const canvas = screen.querySelector('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;

  const towel = screen.querySelector('.opening-towel');
  let frame = 0;
  const timer = window.setTimeout(wipe, 1160);

  signal.addEventListener(
    'abort',
    () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    },
    { once: true },
  );

  function wipe() {
    const width = (canvas.width = screen.clientWidth);
    const height = (canvas.height = screen.clientHeight);
    if (!width || !height) return;
    const clothWidth = Math.min(width * 0.42, height * 0.55);
    const clothHeight = height * 0.43;
    const stamp = createClothStamp(clothWidth, clothHeight);
    if (!stamp) return;

    const turnMargin = clothWidth * 0.65;
    const points = [
      [-turnMargin, height * 0.19],
      [width * 0.48, height * 0.14],
      [width + turnMargin, height * 0.17],
      [width + turnMargin, height * 0.48],
      [width * 0.44, height * 0.52],
      [-turnMargin, height * 0.48],
      [-turnMargin, height * 0.83],
      [width * 0.55, height * 0.8],
      [width + turnMargin, height * 0.84],
    ];
    let totalLength = 0;
    const segments = points.slice(1).map(([x, y], index) => {
      const [fromX, fromY] = points[index];
      const length = Math.hypot(x - fromX, y - fromY);
      const start = totalLength;
      totalLength += length;
      return { x, y, fromX, fromY, length, start, end: totalLength };
    });

    context.fillStyle = getComputedStyle(screen)
      .getPropertyValue('--opening-color')
      .trim();
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'destination-out';
    towel.style.width = `${clothWidth}px`;
    towel.style.height = `${clothHeight}px`;
    screen.classList.add('has-towel-wipe');

    let segmentIndex = 0;
    let nextStamp = 0;
    const stampSpacing = clothHeight * 0.065;
    const started = performance.now();

    function pointAt(distance) {
      while (
        segmentIndex < segments.length - 1 &&
        distance > segments[segmentIndex].end
      ) {
        segmentIndex += 1;
      }

      const segment = segments[segmentIndex];
      const fraction = (distance - segment.start) / segment.length;
      return {
        x: segment.fromX + (segment.x - segment.fromX) * fraction,
        y: segment.fromY + (segment.y - segment.fromY) * fraction,
        angle: segment.x < segment.fromX ? 7 : -9,
      };
    }

    function draw(now) {
      const progress = Math.min(1, (now - started) / 1280);
      const distance = totalLength * progress;
      while (nextStamp <= distance) {
        const { x, y, angle } = pointAt(nextStamp);
        context.save();
        context.translate(x, y);
        context.rotate((angle * Math.PI) / 180);
        context.drawImage(stamp, -stamp.width / 2, -stamp.height / 2);
        context.restore();
        nextStamp += stampSpacing;
      }

      const { x, y, angle } = pointAt(distance);
      towel.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${angle}deg)`;

      if (progress < 1) frame = requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    }

    frame = requestAnimationFrame(draw);
  }
}
