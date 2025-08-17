import { ChartConfiguration } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { createCanvas } from "canvas";
const width = 400;
const height = 200;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export const createChart = async (
  data: number[] | null,
  timeframe?: string
): Promise<Buffer | null> => {
  if (timeframe !== "1h" && timeframe !== "24h") {
    return null;
  }

  if (!data || data.length === 0) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(128,128,128,0.25)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const marginX = width * 0.3;
    const marginY = height * 0.3;

    ctx.beginPath();
    ctx.moveTo(marginX, marginY);
    ctx.lineTo(width - marginX, height - marginY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - marginX, marginY);
    ctx.lineTo(marginX, height - marginY);
    ctx.stroke();

    return canvas.toBuffer("image/png");
  }

  const backgroundPlugin = {
    id: "customBackground",
    beforeDraw: (chart: any) => {
      const ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = "#1c1919"; // dev background
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };

  const glowingPointPlugin = {
    id: "glowingPointPlugin",
    afterDraw: (chart: any) => {
      if (!chart.scales || !data || data.length === 0) return;
      const ctx = chart.ctx;
      const yScale = chart.scales.y;
      const xScale = chart.scales.x;
      const lastValue = data[data.length - 1];
      const x = xScale.getPixelForValue(data.length - 1);
      const y = yScale.getPixelForValue(lastValue);

      ctx.save();

      // glowing blur
      ctx.shadowColor = "rgba(250,182,152,0.9)";
      ctx.shadowBlur = 15;
      ctx.fillStyle = "rgba(250,182,152,0.8)";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI); // slightly larger for glow spread
      ctx.fill();

      // sharp dot on top
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(250,182,152,1)";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    },
  };

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const gradientFill = ctx.createLinearGradient(0, 0, 0, height);
  gradientFill.addColorStop(0, "rgba(250, 182, 152, 0.2)");
  gradientFill.addColorStop(1, "rgba(250, 182, 152, 0)");

  const configuration: ChartConfiguration<"line"> = {
    type: "line",
    data: {
      labels: data.map((_, i) => i),
      datasets: [
        {
          backgroundColor: gradientFill,
          borderColor: "rgba(250, 182, 152, 1)",
          borderWidth: 1,
          data,
          tension: 0.4,
          fill: true,
          pointRadius: 0, // disable default points
          pointHoverRadius: 0,
        },
      ],
    },
    options: {
      responsive: false,
      scales: {
        x: { display: false, grid: { display: false } },
        y: {
          display: false,
          min: Math.min(...data) * 0.99,
          max: Math.max(...data) * 1.01,
          grid: { display: false },
        },
      },
      plugins: { legend: { display: false } },
    },
    plugins: [backgroundPlugin, glowingPointPlugin],
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};
