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
exports.getLocation = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("./db"));
const helper_1 = require("./services/helper");
const getLocation = (ip) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const response = yield axios_1.default.get(`https://ipinfo.io/${ip}/geo`);
    const cityName = (_a = response.data) === null || _a === void 0 ? void 0 : _a.city;
    const cities = db_1.default.getData(".cities");
    const city = cities.find((city) => (0, helper_1.isAlmostMatching)(city.en_name.toLowerCase(), cityName === null || cityName === void 0 ? void 0 : cityName.toLowerCase()));
    return {
        city,
        ip,
    };
});
exports.getLocation = getLocation;
