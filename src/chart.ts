import { ChartConfiguration } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { Canvas, createCanvas } from "canvas";

const width = 400; // px
const height = 200; // px
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

export const createChart = async (data: number[]): Promise<Buffer> => {
  // Create a canvas to generate the gradient
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(250, 182, 152, 0.2)");
  gradient.addColorStop(1, "rgba(250, 182, 152, 0)");

  const configuration: ChartConfiguration<"line"> = {
    type: "line",
    data: {
      labels: data,
      datasets: [
        {
          backgroundColor: gradient, // Use the gradient here
          borderColor: "rgba(250, 182, 152, 1)",
          borderWidth: 1,
          data,
          tension: 0.4, // Smoothing option
          fill: true, // Enable filling the area under the line
          pointRadius: 0, // Hide the points
          pointHoverRadius: 0, // Hide the points on hover
        },
      ],
    },
    options: {
      responsive: false,
      scales: {
        x: {
          display: false, // Remove x-axis
          grid: {
            display: false, // Remove x-axis grid lines
          },
        },
        y: {
          display: false, // Remove y-axis
          min: Math.min(...data) * 0.99,
          max: Math.max(...data) * 1.01,
          grid: {
            display: false, // Remove y-axis grid lines
          },
        },
      },
      elements: {
        line: {
          tension: 0.4, // Smooth the lines
        },
      },
      plugins: {
        legend: {
          display: false, // Remove legend if not needed
        },
      },
    },
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  return image;
};
