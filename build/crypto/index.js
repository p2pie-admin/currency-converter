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
const db_1 = __importDefault(require("../db"));
const coingecko_api_1 = __importDefault(require("coingecko-api"));
const helpers_1 = require("./helpers");
const CoinGeckoClient = new coingecko_api_1.default();
exports.default = () => __awaiter(void 0, void 0, void 0, function* () {
    const allExist = db_1.default.exists(".crypto") && db_1.default.exists(".fiat_to_euro");
    if (!allExist)
        return;
    const crypto = db_1.default.getData(".crypto");
    const fiatToEuro = db_1.default.getData(".fiat_to_euro");
    const ids = Object.keys(crypto).join(",");
    if (!Object.keys(crypto).length || !Object.keys(fiatToEuro).length)
        return;
    const now = Date.now();
    const cryptoMetaPath = ".meta.crypto";
    const cryptoMeta = db_1.default.exists(cryptoMetaPath)
        ? db_1.default.getData(cryptoMetaPath)
        : {};
    const minIntervalMs = 10 * 60 * 1000;
    if (cryptoMeta.lastRequestAt &&
        now - cryptoMeta.lastRequestAt < minIntervalMs) {
        return;
    }
    db_1.default.push(cryptoMetaPath, Object.assign(Object.assign({}, cryptoMeta), { lastRequestAt: now }));
    try {
        let { data } = yield CoinGeckoClient.simple.price({
            ids,
            vs_currencies: "eur",
        });
        if (data) {
            const cryptoToEuroRaw = Object.entries(crypto).reduce((res, [id, code]) => {
                var _a;
                const rate = (_a = data[id]) === null || _a === void 0 ? void 0 : _a.eur;
                if ((0, helpers_1.isValidRate)(rate)) {
                    res[code] = rate;
                }
                return res;
            }, {});
            const sanitizedFiatToEuro = (0, helpers_1.filterValidRates)(fiatToEuro);
            const cryptoToEuro = (0, helpers_1.filterValidRates)(cryptoToEuroRaw);
            const missingCrypto = Object.keys(crypto).filter((id) => { var _a; return !(0, helpers_1.isValidRate)((_a = data[id]) === null || _a === void 0 ? void 0 : _a.eur); });
            const warning = missingCrypto.length > 0
                ? `Partial CoinGecko rates (missing: ${missingCrypto.length})`
                : null;
            if (!Object.keys(cryptoToEuro).length || !Object.keys(sanitizedFiatToEuro).length) {
                db_1.default.push(cryptoMetaPath, Object.assign(Object.assign({}, cryptoMeta), { lastRequestAt: now, lastError: {
                        message: "Invalid rates from CoinGecko",
                        at: now,
                    } }));
                return;
            }
            // const cryptoToCryptoRates = Object.entries(cryptoCodesToEur).reduce((rates, [cryptoCode, cryptoToEuro]) => {
            //   return rates
            // } , {})
            const cryptoToFiatRates = (0, helpers_1.matchRates)(cryptoToEuro, sanitizedFiatToEuro);
            const cryptoToCryptoRates = (0, helpers_1.matchRates)(cryptoToEuro, cryptoToEuro);
            const fiatToFiatRates = (0, helpers_1.matchRates)(sanitizedFiatToEuro, sanitizedFiatToEuro);
            const newRates = Object.assign(Object.assign(Object.assign({}, cryptoToFiatRates), cryptoToCryptoRates), fiatToFiatRates);
            const newRateTimestamps = Object.keys(newRates).reduce((res, key) => (Object.assign(Object.assign({}, res), { [key]: now })), {});
            if (!db_1.default.exists(".rates")) {
                const initialRates = Object.entries(newRates).reduce((res, [key, rate]) => (Object.assign(Object.assign({}, res), { [key]: [rate] })), {});
                const initialRateTimestamps = Object.entries(newRateTimestamps).reduce((res, [key, timestamp]) => (Object.assign(Object.assign({}, res), { [key]: [timestamp] })), {});
                db_1.default.push(".rates", initialRates);
                db_1.default.push(".rates_ts", initialRateTimestamps);
                console.log("rates initiated");
                db_1.default.push(cryptoMetaPath, Object.assign(Object.assign({}, cryptoMeta), { lastRequestAt: now, lastSuccessAt: now, lastError: null, lastWarning: warning ? { message: warning, at: now } : null }));
                db_1.default.save();
                return;
            }
            const oldRates = db_1.default.getData(".rates");
            const oldRateTimestamps = db_1.default.exists(".rates_ts")
                ? db_1.default.getData(".rates_ts")
                : {};
            db_1.default.push(".rates", (0, helpers_1.mergeRates)(oldRates, newRates, 6 * 24));
            db_1.default.push(".rates_ts", (0, helpers_1.mergeRates)(oldRateTimestamps, newRateTimestamps, 6 * 24));
            db_1.default.push(cryptoMetaPath, Object.assign(Object.assign({}, cryptoMeta), { lastRequestAt: now, lastSuccessAt: now, lastError: null, lastWarning: warning ? { message: warning, at: now } : null }));
            db_1.default.save();
        }
        else {
            db_1.default.push(cryptoMetaPath, Object.assign(Object.assign({}, cryptoMeta), { lastRequestAt: now, lastError: { message: "Empty CoinGecko response", at: now } }));
        }
    }
    catch (err) {
        db_1.default.push(cryptoMetaPath, Object.assign(Object.assign({}, cryptoMeta), { lastRequestAt: now, lastError: { message: String(err), at: now } }));
        console.log(err);
    }
});
