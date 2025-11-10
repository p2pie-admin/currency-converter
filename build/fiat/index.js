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
exports.default = () => __awaiter(void 0, void 0, void 0, function* () {
    const symbols = db_1.default.getData(".fiat");
    const url = `${process.env.EXCHANGERATESAPI_URL}&symbols=${symbols}`;
    try {
        const res = yield axios_1.default.get(url);
        if (res.data.rates) {
            const rates = res.data.rates;
            const fiatToEuro = Object.entries(rates).reduce((rates, [key, rate]) => {
                return Object.assign(Object.assign({}, rates), { [key]: 1 / rate });
            }, {});
            db_1.default.push(".fiat_to_euro", fiatToEuro);
            db_1.default.save();
        }
    }
    catch (e) {
        console.log("no fiat for today..", e);
    }
});
