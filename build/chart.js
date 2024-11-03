"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChart = void 0;
const chartjs_node_canvas_1 = require("chartjs-node-canvas");
const canvas_1 = require("canvas");
const width = 400; // px
const height = 200; // px
const chartJSNodeCanvas = new chartjs_node_canvas_1.ChartJSNodeCanvas({ width, height });
const createChart = (data, min, max) => __awaiter(void 0, void 0, void 0, function* () {
    // Create a canvas to generate the gradient
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext("2d");
    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(250, 182, 152, 0.2)");
    gradient.addColorStop(1, "rgba(250, 182, 152, 0)");
    const configuration = {
        type: "line",
        data: {
            labels: data.reverse(),
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
                    min,
                    max,
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
    const image = yield chartJSNodeCanvas.renderToBuffer(configuration);
    return image;
});
exports.createChart = createChart;
