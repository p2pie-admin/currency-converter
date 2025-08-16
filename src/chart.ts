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
  // Only allow 1h or 24h
  if (timeframe !== "1h" && timeframe !== "24h") {
    return null;
  }

  // If no data at all → big semi-transparent X
  if (!data || data.length === 0) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(128,128,128,0.25)"; // nearly transparent gray
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    // draw X
    ctx.beginPath();
    ctx.moveTo(50, 30);
    ctx.lineTo(width - 50, height - 30);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - 50, 30);
    ctx.lineTo(50, height - 30);
    ctx.stroke();

    return canvas.toBuffer("image/png");
  }

  // Normal chart if data exists
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(250, 182, 152, 0.2)");
  gradient.addColorStop(1, "rgba(250, 182, 152, 0)");

  const configuration: ChartConfiguration<"line"> = {
    type: "line",
    data: {
      labels: data.map((_, i) => i),
      datasets: [
        {
          backgroundColor: gradient,
          borderColor: "rgba(250, 182, 152, 1)",
          borderWidth: 1,
          data,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
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
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};
