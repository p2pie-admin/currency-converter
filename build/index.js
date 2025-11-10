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
const auth_1 = __importDefault(require("./services/auth"));
const callStrapi_1 = __importDefault(require("./services/callStrapi"));
const queries_1 = require("./services/queries");
const getLocation_1 = require("./getLocation");
dotenv_1.default.config();
const server = (0, fastify_1.default)({
    logger: true,
});
server.get("/", (req, reply) => __awaiter(void 0, void 0, void 0, function* () {
    reply.header("Access-Control-Allow-Origin", "*");
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    try {
        const location = yield (0, getLocation_1.getLocation)(ip);
        reply.send(location);
    }
    catch (error) {
        console.error(error);
        reply.status(500).send(JSON.stringify({
            text: "Error retrieving location information",
            ip,
            location,
        }));
    }
}));
// Declare a route
server.get("/:dir/:timeframe?", (req, reply) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    reply.header("Access-Control-Allow-Origin", "*");
    const dirRequested = (_b = (_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a.dir) === null || _b === void 0 ? void 0 : _b.toUpperCase();
    const timeframe = (_c = req === null || req === void 0 ? void 0 : req.params) === null || _c === void 0 ? void 0 : _c.timeframe;
    let dayRates = null;
    try {
        dayRates = db_1.default.getData(`.rates.${dirRequested}`);
    }
    catch (_k) {
        dayRates = null;
    }
    // Chart mode
    if (timeframe === "1h" || timeframe === "24h") {
        const data = timeframe === "1h"
            ? (_d = dayRates === null || dayRates === void 0 ? void 0 : dayRates.slice(-6)) !== null && _d !== void 0 ? _d : null
            : (_e = dayRates === null || dayRates === void 0 ? void 0 : dayRates.filter((_, i) => i % 5 === 0)) !== null && _e !== void 0 ? _e : null;
        const image = yield (0, chart_1.createChart)(data, timeframe);
        if (!image) {
            reply.send(null);
            return;
        }
        reply.header("Content-Type", "image/png");
        reply.send(image);
        return;
    }
    // If timeframe not recognized → return null
    if (timeframe) {
        reply.send(null);
        return;
    }
    // Default (no timeframe): return rates info
    if (!dayRates || dayRates.length === 0) {
        reply.send(null);
        return;
    }
    const [give, get] = dirRequested.split("_");
    const currentRate = dayRates[dayRates.length - 1];
    let giveToUSD = null;
    let getToUSD = null;
    try {
        giveToUSD = (_g = (_f = db_1.default.getData(`.rates.${give}_USD`)) === null || _f === void 0 ? void 0 : _f[0]) !== null && _g !== void 0 ? _g : null;
    }
    catch (_l) { }
    try {
        getToUSD = (_j = (_h = db_1.default.getData(`.rates.${get}_USD`)) === null || _h === void 0 ? void 0 : _h[0]) !== null && _j !== void 0 ? _j : null;
    }
    catch (_m) { }
    const dayTrend = ((currentRate - dayRates[0]) / currentRate) * 100;
    const hourTrend = ((currentRate - dayRates[dayRates.length - 6]) / currentRate) * 100;
    reply.send({ currentRate, giveToUSD, getToUSD, dayTrend, hourTrend });
}));
const port = +process.env.CONVERTER_PORT;
console.log("port is: ", port);
// Run the server!
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    var _o, _p;
    try {
        yield server.listen({ port, host: "0.0.0.0" });
        yield (0, auth_1.default)();
        const cities = (_p = (_o = (yield (0, callStrapi_1.default)(queries_1.citiesQuery))) === null || _o === void 0 ? void 0 : _o.parserSetting) === null || _p === void 0 ? void 0 : _p.cities;
        if (cities)
            db_1.default.push(".cities", cities);
        (0, getLocation_1.getLocation)("");
        setTimeout(fiat_1.default, 5000);
        setTimeout(crypto_1.default, 6000);
        setInterval(crypto_1.default, 1000 * 60 * 30); // every 30min
        setInterval(fiat_1.default, 1000 * 60 * 60 * 12); // every 12h
    }
    catch (error) {
        server.log.error(error);
        process.exit(1);
    }
});
start();
