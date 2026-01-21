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
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("../db"));
const reserved_1 = require("./reserved");
exports.default = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const symbols = db_1.default.getData(".fiat");
    const url = `${process.env.EXCHANGERATESAPI_URL}&symbols=${symbols}`;
    const now = Date.now();
    const fiatMetaPath = ".meta.fiat";
    const fiatMeta = db_1.default.exists(fiatMetaPath)
        ? db_1.default.getData(fiatMetaPath)
        : {};
    const todayKey = new Date(now).toISOString().slice(0, 10);
    const requestCount = fiatMeta.day === todayKey ? (_a = fiatMeta.count) !== null && _a !== void 0 ? _a : 0 : 0;
    if (requestCount >= 3) {
        return;
    }
    let fiatToEuro = reserved_1.reserved;
    try {
        db_1.default.push(fiatMetaPath, Object.assign(Object.assign({}, fiatMeta), { day: todayKey, count: requestCount + 1, lastRequestAt: now }));
        const res = yield axios_1.default.get(url);
        if ((_b = res.data) === null || _b === void 0 ? void 0 : _b.rates) {
            const parsedRates = Object.entries(res.data.rates).reduce((rates, [key, rate]) => {
                const numericRate = Number(rate);
                if (Number.isFinite(numericRate) && numericRate > 0) {
                    return Object.assign(Object.assign({}, rates), { [key]: 1 / numericRate });
                }
                return rates;
            }, {});
            fiatToEuro = Object.keys(parsedRates).length ? parsedRates : reserved_1.reserved;
            console.log("✅ Rates fetched from API");
            if (Object.keys(parsedRates).length) {
                db_1.default.push(fiatMetaPath, Object.assign(Object.assign({}, fiatMeta), { day: todayKey, count: requestCount + 1, lastRequestAt: now, lastSuccessAt: now, lastError: null, lastWarning: null }));
            }
            else {
                db_1.default.push(fiatMetaPath, Object.assign(Object.assign({}, fiatMeta), { day: todayKey, count: requestCount + 1, lastRequestAt: now, lastError: { message: "Invalid rates from API", at: now }, lastWarning: { message: "Fallback to reserved rates", at: now } }));
            }
        }
        else {
            console.log("⚠️ No rates in response, using reserved");
            db_1.default.push(fiatMetaPath, Object.assign(Object.assign({}, fiatMeta), { day: todayKey, count: requestCount + 1, lastRequestAt: now, lastError: { message: "No rates in response", at: now } }));
        }
    }
    catch (e) {
        console.log("⚠️ No fiat for today, using reserved..", (e === null || e === void 0 ? void 0 : e.message) || e);
        db_1.default.push(fiatMetaPath, Object.assign(Object.assign({}, fiatMeta), { day: todayKey, count: requestCount + 1, lastRequestAt: now, lastError: { message: (e === null || e === void 0 ? void 0 : e.message) || String(e), at: now } }));
    }
    db_1.default.push(".fiat_to_euro", fiatToEuro);
    db_1.default.save();
});
