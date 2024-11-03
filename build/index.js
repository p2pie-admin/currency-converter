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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("./crypto"));
const fiat_1 = __importDefault(require("./fiat"));
const db_1 = __importDefault(require("./db"));
const chart_1 = require("./chart");
dotenv_1.default.config();
const server = (0, fastify_1.default)({
    logger: true,
});
server.get("/", (req, reply) => __awaiter(void 0, void 0, void 0, function* () { return reply.send("working..."); }));
// Declare a route
server.get("/:dir/:timeframe?", (req, reply) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    reply.header("Access-Control-Allow-Origin", "*");
    const dirRequested = (_b = (_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a.dir) === null || _b === void 0 ? void 0 : _b.toUpperCase();
    const timeframe = (_c = req === null || req === void 0 ? void 0 : req.params) === null || _c === void 0 ? void 0 : _c.timeframe;
    const dayRates = db_1.default.getData(`.rates.${dirRequested}`);
    if (!timeframe) {
        const [give, get] = dirRequested.split("_");
        const rate = dayRates[0];
        const giveToUSD = db_1.default.getData(`.rates.${give}_USD`)[0];
        const getToUSD = db_1.default.getData(`.rates.${get}_USD`)[0];
        const dayTrend = ((rate - (dayRates === null || dayRates === void 0 ? void 0 : dayRates[24 * 6]) || 0) / rate) * 100;
        const hourTrend = ((rate - (dayRates === null || dayRates === void 0 ? void 0 : dayRates[6]) || 0) / rate) * 100;
        reply.send({ rate, giveToUSD, getToUSD, dayTrend, hourTrend });
        return;
    }
    try {
        const hourRates = dayRates.slice(-1 * 6);
        const [min, max] = [
            Math.min(...dayRates) * 0.995,
            Math.max(...dayRates) * 1.005,
        ];
        const image = timeframe == "hour"
            ? yield (0, chart_1.createChart)(hourRates, min, max)
            : yield (0, chart_1.createChart)(dayRates.filter((_, i) => i % 24 == 0), min, max);
        reply.header("Content-Type", "image/png");
        reply.send(image);
    }
    catch (error) {
        console.error(error);
        reply.status(500).send("Error generating chart");
    }
}));
const port = +process.env.CONVERTER_PORT;
console.log("port is: ", port);
// Run the server!
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield server.listen({ port, host: "0.0.0.0" });
        //await auth();
        setTimeout(fiat_1.default, 5000);
        setTimeout(crypto_1.default, 6000);
        setInterval(crypto_1.default, 1000 * 60 * 10); // ~ раз 10 мин
        setInterval(fiat_1.default, 11000000); // >3h for 250 api calls per month
    }
    catch (error) {
        server.log.error(error);
        process.exit(1);
    }
});
start();
