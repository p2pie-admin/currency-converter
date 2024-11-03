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
exports.getAllPossibleCryptoRates = void 0;
const coingecko_api_1 = __importDefault(require("coingecko-api"));
const db_1 = __importDefault(require("../db"));
const crypto_1 = __importDefault(require("./crypto"));
const CoinGeckoClient = new coingecko_api_1.default();
// забираем постепенно курсы вообще всех существующих криптовалют, затем фильтруем их по капитализации
// оставляем только те что больше 10кк (261шт)
function splitToNChunks(array, n) {
    let result = [];
    for (let i = n; i > 0; i--) {
        result.push(array.splice(0, Math.ceil(array.length / i)));
    }
    return result;
}
const getAllPossibleCryptoRates = () => __awaiter(void 0, void 0, void 0, function* () {
    const chunks = splitToNChunks(crypto_1.default.map((c) => c.id), 300);
    chunks.map((chunk, index) => {
        setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
            let { data } = yield CoinGeckoClient.simple.price({
                ids: chunk.join(","),
                vs_currencies: "usd",
                include_market_cap: true,
            });
            if (data) {
                console.log(Object.keys(data).length);
                const prev = db_1.default.getData(".crypto_rates");
                db_1.default.push(".crypto_rates", Object.assign(Object.assign({}, prev), data));
                db_1.default.save();
            }
        }), index * 20000);
    });
});
exports.getAllPossibleCryptoRates = getAllPossibleCryptoRates;
// const filtered = Object.entries(crypto_rates).reduce(
//   (res, [id, data]: any) => {
//     if (data.usd_market_cap > 10000000) return { ...res, [id]: data.usd };
//     return res;
//   },
//   {}
// );
// db.push(".filtered", filtered);
// db.save();
// console.log(Object.keys(filtered).length);
