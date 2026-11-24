export function initLinenScene({
  canvas,
  region,
  mirror,
  mirrorRegion,
  onPlaybackChange,
  canPush,
  columns = 64,
  rows = 80,
  pixelRatioLimit = 2,
}) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const mirrorContext = mirror?.getContext('2d');
  let mirrorVisible = false;
  let visible = Boolean(mirror);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lines = [{ depth: 0, top: -220, speed: 18, spacing: 300, length: 850 }];
  let width = 0;
  let height = 0;
  let time = 0;
  let previousFrame = 0;
  let frame = 0;
  let paused = reducedMotion.matches;
  const pointer = { clientX: null, clientY: null };
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
    if (mirrorVisible && mirror.width && mirror.height) {
      mirrorContext.clearRect(0, 0, mirror.width, mirror.height);
      mirrorContext.drawImage(canvas, 0, 0, mirror.width, mirror.height);
    }
    const visibleCloth = new Set(surfaces.map(({ id }) => id));
    for (const id of clothMotion.keys()) {
      if (!visibleCloth.has(id)) clothMotion.delete(id);
    }
  }

  function animate(now) {
    frame = 0;
    if (paused || !visible || document.hidden) return;
    if (previousFrame && now - previousFrame < 1000 / 30) {
      frame = requestAnimationFrame(animate);
      return;
    }
    // Cap long gaps so returning to the tab doesn't jump the fabric forward.
    const elapsed = previousFrame
      ? Math.min(now - previousFrame, 50) / 1000
      : 0;
    time += elapsed;
    advanceCloth(elapsed);
    previousFrame = now;
    draw();
    frame = requestAnimationFrame(animate);
  }

  function ensureAnimation() {
    if (!paused && visible && !document.hidden && !frame) {
      previousFrame = 0;
      frame = requestAnimationFrame(animate);
    }
  }

  function updatePlayback() {
    onPlaybackChange?.(paused);
    cancelAnimationFrame(frame);
    frame = 0;
    previousFrame = 0;
    if (paused) {
      clearPointer();
      clothMotion.clear();
      if (width && height) draw();
    }
    ensureAnimation();
  }

  const resize = new ResizeObserver(() => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, pixelRatioLimit);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (width && height) draw();
  });
  resize.observe(canvas);
  if (mirrorContext) {
    const mirrorResize = new ResizeObserver(() => {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      mirror.width = Math.round(mirror.clientWidth * ratio);
      mirror.height = Math.round(mirror.clientHeight * ratio);
      if (width && height) draw();
    });
    mirrorResize.observe(mirror);
    new IntersectionObserver(([entry]) => {
      mirrorVisible = entry.isIntersecting;
      if (mirrorVisible && width && height) draw();
    }).observe(mirrorRegion);
  } else {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) ensureAnimation();
    }).observe(region);
  }
  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    updatePlayback();
  });
  document.addEventListener('visibilitychange', updatePlayback);
  window.addEventListener('pageshow', ensureAnimation);
  region.addEventListener('pointerenter', ensureAnimation);
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
    if (
      paused ||
      !width ||
      !height ||
      (!mirror && event.pointerType === 'touch')
    )
      return;
    if (canPush && !canPush(event)) {
      clearPointer();
      return;
    }
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
    const targetCanvas = event.currentTarget === mirrorRegion ? mirror : canvas;
    const bounds = targetCanvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) * width) / bounds.width;
    const y = ((event.clientY - bounds.top) * height) / bounds.height;
    if (x < 0 || x > width || y < 0 || y > height) return;
    const surface = surfaces.findLast(({ outline }) =>
      containsPoint(outline, x, y),
    );
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
  function clearPointer() {
    pointer.clientX = null;
    pointer.clientY = null;
  }
  for (const surface of [region, mirrorRegion]) {
    if (!surface) continue;
    surface.addEventListener('pointermove', pushLinen);
    surface.addEventListener('pointerleave', clearPointer);
    surface.addEventListener('pointercancel', clearPointer);
  }
  region.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'touch') clearPointer();
  });
}
