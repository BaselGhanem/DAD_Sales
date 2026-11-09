/* Shared value labels for every Chart.js chart, including animated updates. */
(() => {
  const number = new Intl.NumberFormat(`en-US`, {maximumFractionDigits: 2});
  Chart.register({
    id: `salesValueLabels`,
    afterDatasetsDraw(chart) {
      const {ctx, width, height} = chart;
      const horizontal = chart.options.indexAxis === `y`;
      ctx.save();
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        if (!chart.isDatasetVisible(datasetIndex)) return;
        const meta = chart.getDatasetMeta(datasetIndex);
        const dense = !horizontal && dataset.data.length > 12;
        ctx.font = `700 ${dense ? 9 : 10}px Almarai, Arial, sans-serif`;
        ctx.fillStyle = `#123b55`;
        ctx.strokeStyle = `rgba(255,255,255,0.96)`;
        ctx.lineWidth = 3;
        ctx.lineJoin = `round`;
        meta.data.forEach((element, index) => {
          const raw = dataset.data[index];
          const value = typeof raw === `number` ? raw : Number(raw?.[horizontal ? `x` : `y`]);
          if (!Number.isFinite(value) || element.skip || !chart.getDataVisibility(index)) return;
          const {x, y} = element.tooltipPosition();
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;
          const text = number.format(value);
          const textWidth = ctx.measureText(text).width;
          ctx.save();
          if (horizontal) {
            const negative = value < 0;
            ctx.textAlign = negative ? `right` : `left`;
            ctx.textBaseline = `middle`;
            const labelX = negative ? Math.max(textWidth + 4, x - 7) : Math.min(width - textWidth - 4, x + 7);
            ctx.translate(labelX, Math.max(8, Math.min(height - 8, y)));
          } else if (dense) {
            ctx.translate(Math.max(9, Math.min(width - 9, x)), Math.max(textWidth + 6, Math.min(height - 6, y - 9)));
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = `left`;
            ctx.textBaseline = `middle`;
          } else {
            ctx.translate(Math.max(textWidth / 2 + 4, Math.min(width - textWidth / 2 - 4, x)), Math.max(15, Math.min(height - 8, y - 10)));
            ctx.textAlign = `center`;
            ctx.textBaseline = `bottom`;
          }
          ctx.strokeText(text, 0, 0);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        });
      });
      ctx.restore();
    }
  });
})();
