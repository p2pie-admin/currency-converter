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
const graphql_request_1 = require("graphql-request");
const db_1 = __importDefault(require("../db"));
const normalizer_1 = __importDefault(require("./normalizer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const env = process.env.NODE_ENV || "development";
const strapiLink = env === "production" ? process.env.STRAPI : process.env.DEV_STRAPI;
const callStrapi = (query, variables) => __awaiter(void 0, void 0, void 0, function* () {
    const jwt = db_1.default.getData(".jwt");
    const headers = jwt
        ? {
            authorization: `Bearer ${jwt}`,
        }
        : {};
    const graphQLClient = new graphql_request_1.GraphQLClient(strapiLink || "", {
        headers,
    });
    try {
        const data = yield graphQLClient.request(query, variables);
        const res = (0, normalizer_1.default)(data);
        return res;
    }
    catch (err) {
        console.error("📙 \u001b[1;33m -- GQL ERROR -- ");
        console.error("📙 \u001b[1;33m JWT exists:", jwt && jwt.length > 5);
        console.error(err);
    }
});
exports.default = callStrapi;
