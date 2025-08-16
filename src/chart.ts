import { ChartConfiguration } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { createCanvas } from "canvas";

const width = 400;
const height = 200;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export const createChart = async (data: number[]): Promise<Buffer> => {
  // If no data, return a canvas with "No graph available"
  if (!data || data.length === 0) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    // Text
    ctx.fillStyle = "gray";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("No graph available", width / 2, height / 2);

    return canvas.toBuffer("image/png");
  }

  // Create gradient for chart
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
