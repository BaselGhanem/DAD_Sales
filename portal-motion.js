(() => {
  const panel = document.querySelector(`.entry-motion`);
  const canvas = document.getElementById(`entry-motion-chart`);
  const context = canvas.getContext(`2d`);
  if (!context) return;

  const plot = canvas.parentElement;
  const series = [
    {values: [22, 34, 27, 42, 31, 49, 44, 63, 54, 73, 65, 81], stroke: `#7cf5d7`, fill: `#64e9c564`},
    {values: [15, 22, 17, 30, 22, 33, 27, 38, 32, 48, 41, 53], stroke: `#80bddb`, fill: `#64a7d04d`}
  ];
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

  new ResizeObserver(draw).observe(plot);
  draw();
})();
