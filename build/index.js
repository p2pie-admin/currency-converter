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
server.addHook("onRequest", (req, reply) => __awaiter(void 0, void 0, void 0, function* () {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
    reply.header("Cross-Origin-Resource-Policy", "cross-origin");
    if (req.method === "OPTIONS") {
        reply.status(204).send();
    }
}));
const normalizeIp = (ip) => {
    if (!ip)
        return null;
    let normalized = ip.trim();
    if (!normalized || normalized.toLowerCase() === "unknown") {
        return null;
    }
    if (normalized.startsWith("::ffff:")) {
        normalized = normalized.replace("::ffff:", "");
    }
    // Remove port from IPv4 addresses (e.g., 192.168.0.1:12345).
    if (normalized.includes(":") && normalized.includes(".")) {
        normalized = normalized.split(":")[0];
    }
    if (normalized === "127.0.0.1" || normalized === "::1") {
        return null;
    }
    return normalized;
};
const getClientIp = (req) => {
    var _a;
    const forwarded = req.headers["x-forwarded-for"];
    const forwardedValue = Array.isArray(forwarded)
        ? forwarded.find(Boolean)
        : forwarded;
    const fromHeader = forwardedValue === null || forwardedValue === void 0 ? void 0 : forwardedValue.split(",").map((segment) => segment.trim()).find(Boolean);
    const rawIp = fromHeader || ((_a = req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) || req.ip;
    return normalizeIp(rawIp);
};
const getPairRateInfo = (dirRequested, existingDayRates) => {
    var _a, _b, _c, _d, _e, _f;
    const now = Date.now();
    let dayRates = existingDayRates;
    if (!dayRates) {
        try {
            dayRates = db_1.default.getData(`.rates.${dirRequested}`);
        }
        catch (_g) {
            dayRates = null;
        }
    }
    if (!dayRates || dayRates.length === 0) {
        return null;
    }
    const [give, get] = dirRequested.split("_");
    const lastKnownRate = (_a = [...dayRates].reverse().find((rate) => Number.isFinite(rate) && rate > 0)) !== null && _a !== void 0 ? _a : null;
    const currentRate = lastKnownRate !== null && lastKnownRate !== void 0 ? lastKnownRate : dayRates[dayRates.length - 1];
    let giveToUSD = null;
    let getToUSD = null;
    try {
        giveToUSD = (_c = (_b = db_1.default.getData(`.rates.${give}_USD`)) === null || _b === void 0 ? void 0 : _b[0]) !== null && _c !== void 0 ? _c : null;
    }
    catch (_h) { }
    try {
        getToUSD = (_e = (_d = db_1.default.getData(`.rates.${get}_USD`)) === null || _d === void 0 ? void 0 : _d[0]) !== null && _e !== void 0 ? _e : null;
    }
    catch (_j) { }
    const dayTrend = dayRates.length >= 2 && currentRate > 0
        ? ((currentRate - dayRates[0]) / currentRate) * 100
        : null;
    const hourTrend = dayRates.length >= 6 && currentRate > 0
        ? ((currentRate - dayRates[dayRates.length - 6]) / currentRate) * 100
        : null;
    let lastRateTimestamp = null;
    try {
        const timestamps = db_1.default.getData(`.rates_ts.${dirRequested}`);
        lastRateTimestamp = (_f = timestamps === null || timestamps === void 0 ? void 0 : timestamps[timestamps.length - 1]) !== null && _f !== void 0 ? _f : null;
    }
    catch (_k) {
        lastRateTimestamp = null;
    }
    const issues = [];
    if (!currentRate || !Number.isFinite(currentRate)) {
        issues.push({ source: "rates", reason: "invalid_current_rate" });
    }
    else if (currentRate !== dayRates[dayRates.length - 1]) {
        issues.push({ source: "rates", reason: "used_last_valid_rate" });
    }
    if (!lastRateTimestamp) {
        issues.push({ source: "rates", reason: "missing_timestamp" });
    }
    else if (now - lastRateTimestamp > 2 * 60 * 60 * 1000) {
        issues.push({
            source: "rates",
            reason: "stale_rate",
            at: lastRateTimestamp,
        });
    }
    const meta = db_1.default.exists(".meta") ? db_1.default.getData(".meta") : {};
    const fiatMeta = meta === null || meta === void 0 ? void 0 : meta.fiat;
    const cryptoMeta = meta === null || meta === void 0 ? void 0 : meta.crypto;
    if ((fiatMeta === null || fiatMeta === void 0 ? void 0 : fiatMeta.lastError) &&
        (!(fiatMeta === null || fiatMeta === void 0 ? void 0 : fiatMeta.lastSuccessAt) ||
            fiatMeta.lastError.at >= fiatMeta.lastSuccessAt)) {
        issues.push({
            source: "exchangeratesapi",
            reason: fiatMeta.lastError.message || "fiat_rates_error",
            at: fiatMeta.lastError.at,
        });
    }
    else if (fiatMeta === null || fiatMeta === void 0 ? void 0 : fiatMeta.lastWarning) {
        issues.push({
            source: "exchangeratesapi",
            reason: fiatMeta.lastWarning.message || "fiat_rates_warning",
            at: fiatMeta.lastWarning.at,
        });
    }
    else if ((fiatMeta === null || fiatMeta === void 0 ? void 0 : fiatMeta.lastSuccessAt) && now - fiatMeta.lastSuccessAt > 36 * 60 * 60 * 1000) {
        issues.push({
            source: "exchangeratesapi",
            reason: "fiat_rates_stale",
            at: fiatMeta.lastSuccessAt,
        });
    }
    if ((cryptoMeta === null || cryptoMeta === void 0 ? void 0 : cryptoMeta.lastError) &&
        (!(cryptoMeta === null || cryptoMeta === void 0 ? void 0 : cryptoMeta.lastSuccessAt) ||
            cryptoMeta.lastError.at >= cryptoMeta.lastSuccessAt)) {
        issues.push({
            source: "coingecko",
            reason: cryptoMeta.lastError.message || "crypto_rates_error",
            at: cryptoMeta.lastError.at,
        });
    }
    else if (cryptoMeta === null || cryptoMeta === void 0 ? void 0 : cryptoMeta.lastWarning) {
        issues.push({
            source: "coingecko",
            reason: cryptoMeta.lastWarning.message || "crypto_rates_warning",
            at: cryptoMeta.lastWarning.at,
        });
    }
    else if ((cryptoMeta === null || cryptoMeta === void 0 ? void 0 : cryptoMeta.lastSuccessAt) && now - cryptoMeta.lastSuccessAt > 2 * 60 * 60 * 1000) {
        issues.push({
            source: "coingecko",
            reason: "crypto_rates_stale",
            at: cryptoMeta.lastSuccessAt,
        });
    }
    return Object.assign({ currentRate,
        giveToUSD,
        getToUSD,
        dayTrend,
        hourTrend }, (issues.length ? { issue: issues } : {}));
};
server.get("/", (req, reply) => __awaiter(void 0, void 0, void 0, function* () {
    const ip = getClientIp(req);
    try {
        const location = yield (0, getLocation_1.getLocation)(ip);
        const btcRub = getPairRateInfo("BTC_RUB");
        reply.send(Object.assign(Object.assign({}, location), { BTC_RUB: btcRub }));
    }
    catch (error) {
        req.log.error({ err: error, ip }, "IP lookup failed");
        reply.status(502).send({
            text: "Error retrieving location information",
            ip,
        });
    }
}));
// Declare a route
server.get("/:dir/:timeframe?", (req, reply) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const dirRequested = (_b = (_a = req === null || req === void 0 ? void 0 : req.params) === null || _a === void 0 ? void 0 : _a.dir) === null || _b === void 0 ? void 0 : _b.toUpperCase();
    const timeframe = (_c = req === null || req === void 0 ? void 0 : req.params) === null || _c === void 0 ? void 0 : _c.timeframe;
    let dayRates = null;
    try {
        dayRates = db_1.default.getData(`.rates.${dirRequested}`);
    }
    catch (_f) {
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
    const pairRates = getPairRateInfo(dirRequested, dayRates);
    reply.send(pairRates);
}));
const port = +process.env.CONVERTER_PORT;
console.log("port is: ", port);
// Run the server!
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h;
    try {
        yield server.listen({ port, host: "0.0.0.0" });
        yield (0, auth_1.default)();
        const cities = (_h = (_g = (yield (0, callStrapi_1.default)(queries_1.citiesQuery))) === null || _g === void 0 ? void 0 : _g.parserSetting) === null || _h === void 0 ? void 0 : _h.cities;
        if (cities)
            db_1.default.push(".cities", cities);
        (0, getLocation_1.getLocation)("");
        yield (0, fiat_1.default)();
        yield (0, crypto_1.default)();
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
