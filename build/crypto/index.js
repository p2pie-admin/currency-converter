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
    try {
        let { data } = yield CoinGeckoClient.simple.price({
            ids,
            vs_currencies: "eur",
        });
        if (data) {
            const cryptoToEuro = Object.entries(crypto).reduce((res, [id, code]) => { var _a; return (Object.assign(Object.assign({}, res), { [code]: (_a = data[id]) === null || _a === void 0 ? void 0 : _a.eur })); }, {});
            // const cryptoToCryptoRates = Object.entries(cryptoCodesToEur).reduce((rates, [cryptoCode, cryptoToEuro]) => {
            //   return rates
            // } , {})
            const cryptoToFiatRates = (0, helpers_1.matchRates)(cryptoToEuro, fiatToEuro);
            const cryptoToCryptoRates = (0, helpers_1.matchRates)(cryptoToEuro, cryptoToEuro);
            const fiatToFiatRates = (0, helpers_1.matchRates)(fiatToEuro, fiatToEuro);
            const newRates = Object.assign(Object.assign(Object.assign({}, cryptoToFiatRates), cryptoToCryptoRates), fiatToFiatRates);
            if (!db_1.default.exists(".rates")) {
                const initialRates = Object.entries(newRates).reduce((res, [key, rate]) => (Object.assign(Object.assign({}, res), { [key]: [rate] })), {});
                db_1.default.push(".rates", initialRates);
                console.log("rates initiated");
                db_1.default.save();
                return;
            }
            const oldRates = db_1.default.getData(".rates");
            // console.log("oldRates", Object.keys(oldRates)?.length);
            db_1.default.push(".rates", (0, helpers_1.mergeRates)(oldRates, newRates, 6 * 24));
            db_1.default.save();
        }
    }
    catch (err) {
        console.log(err);
    }
});
