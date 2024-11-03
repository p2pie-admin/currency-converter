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
const callStrapi_1 = __importDefault(require("./callStrapi"));
const queries_1 = require("./queries");
function auth() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        db_1.default.push(".jwt", undefined);
        console.log("Authorizing ...");
        const data = yield (0, callStrapi_1.default)(queries_1.AuthMutation);
        const jwt = (_a = data === null || data === void 0 ? void 0 : data.login) === null || _a === void 0 ? void 0 : _a.jwt;
        if (jwt) {
            console.log("📗 \u001b[1;32m Authorized successfully!");
            db_1.default.push(".jwt", jwt);
            return;
        }
        console.error("📙 \u001b[1;33m couldn't authtorize, restarting in 10s...");
        yield new Promise((resolve) => setTimeout(resolve, 10000));
        yield auth();
    });
}
// const initJWT = async (): Promise<string | undefined> => {
//   db.push(".jwt", undefined); //чистим старый токен
//   const data = await callStrapi(AuthMutation);
//   if (!data) {
//     console.log(
//       "📙 \u001b[1;33m  Still waiting for connection, retrying in 25s..."
//     );
//     setTimeout(() => initJWT(), 25000);
//     return;
//   }
//   const jwt = data?.login?.jwt;
//   if (jwt) {
//     console.log("📗 \u001b[1;32m Authorized successfully!");
//     db.push(".jwt", jwt);
//     db.save();
//     return jwt;
//   }
//   console.error("📙 \u001b[1;33m couldn't authtorize");
//   return;
// };
exports.default = auth;
