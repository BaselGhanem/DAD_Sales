(() => {
  const panel = document.querySelector(`.entry-motion`);
  const canvas = document.getElementById(`entry-motion-chart`);
  const output = document.getElementById(`entry-motion-value`);
  const toggle = document.getElementById(`entry-motion-toggle`);
  const context = canvas.getContext(`2d`);
  if (!context) return;

  const plot = canvas.parentElement;
  const reducedMotion = matchMedia(`(prefers-reduced-motion: reduce)`);
  const format = new Intl.NumberFormat(`en-US`);
  const series = [
    {values: [22, 34, 27, 42, 31, 49, 44, 63, 54, 73, 65, 81], stroke: `#7cf5d7`, fill: `#64e9c564`},
    {values: [15, 22, 17, 30, 22, 33, 27, 38, 32, 48, 41, 53], stroke: `#80bddb`, fill: `#64a7d04d`}
  ];
  let current = 48260;
  let interval = 0;
  let frame = 0;
  let paused = reducedMotion.matches;
  let onScreen = false;

  function draw() {
    const width = plot.clientWidth;
    const height = plot.clientHeight;
    if (!width || !height) return;
    const scale = Math.min(devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * scale);
    const pixelHeight = Math.round(height * scale);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    context.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
    context.clearRect(0, 0, width, height);

    for (const [index, {values, stroke, fill}] of series.entries()) {
      const points = values.map((value, position) => ({
        x: 8 + position * (width - 27) / (values.length - 1),
        y: 5 + (1 - value / 100) * (height - 10)
      }));
      const first = points[0];
      const last = points.at(-1);
      const line = new Path2D();
      line.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const previous = points[i - 1];
        const next = points[i];
        const middle = (previous.x + next.x) / 2;
        line.bezierCurveTo(middle, previous.y, middle, next.y, next.x, next.y);
      }
      const area = new Path2D(line);
      area.lineTo(last.x, height);
      area.lineTo(first.x, height);
      area.closePath();
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, fill);
      gradient.addColorStop(1, `transparent`);
      context.fillStyle = gradient;
      context.fill(area);
      context.strokeStyle = stroke;
      context.lineWidth = index === 0 ? 2 : 1.4;
      context.stroke(line);
      if (index === 0) {
        plot.style.setProperty(`--dot-x`, `${last.x}px`);
        plot.style.setProperty(`--dot-y`, `${last.y}px`);
      }
    }
    panel.dataset.ready = ``;
  }

  function tick() {
    const start = current;
    const end = 42000 + Math.floor(Math.random() * 19000);
    const nextSeries = series.map(({values}) => {
      const next = values.at(-1) + (Math.random() - .46) * 36;
      return [...values.slice(1), Math.max(17, Math.min(90, next))];
    });
    const previousSeries = series.map(({values}) => [...values]);
    const started = performance.now();
    let lastDraw = -Infinity;
    function count(now) {
      const progress = Math.min(1, (now - started) / 520);
      if (progress === 1 || now - lastDraw >= 32) {
        const eased = 1 - (1 - progress) ** 3;
        current = Math.round(start + (end - start) * eased);
        output.textContent = format.format(current);
        for (const [index, {values}] of series.entries()) {
          for (let i = 0; i < values.length; i++) {
            const previous = previousSeries[index][i];
            values[i] = previous + (nextSeries[index][i] - previous) * eased;
          }
        }
        draw();
        lastDraw = now;
      }
      frame = progress < 1 ? requestAnimationFrame(count) : 0;
    }
    frame = requestAnimationFrame(count);
  }

  function sync() {
    const running = onScreen && !document.hidden && !paused;
    panel.toggleAttribute(`data-running`, running);
    toggle.textContent = paused ? `Play animation` : `Pause animation`;
    if (running && !interval) interval = setInterval(tick, 3000);
    if (!running) {
      clearInterval(interval);
      cancelAnimationFrame(frame);
      interval = frame = 0;
    }
  }

  new ResizeObserver(draw).observe(plot);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(panel);
  reducedMotion.addEventListener(`change`, event => {
    paused = event.matches;
    sync();
  });
  document.addEventListener(`visibilitychange`, sync);
  toggle.addEventListener(`click`, () => {
    paused = !paused;
    sync();
  });
  toggle.hidden = false;
  draw();
  sync();
})();
