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
const EARTH_RADIUS_KM = 6371;
const MAX_COORD_DISTANCE_KM = 100;
const toRadians = (degrees) => (degrees * Math.PI) / 180;
const getDistanceKm = (a, b) => {
    if (a.length !== 2 || b.length !== 2)
        return Number.POSITIVE_INFINITY;
    const [lat1, lon1] = a;
    const [lat2, lon2] = b;
    if (!Number.isFinite(lat1) ||
        !Number.isFinite(lon1) ||
        !Number.isFinite(lat2) ||
        !Number.isFinite(lon2)) {
        return Number.POSITIVE_INFINITY;
    }
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const haversine = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    return EARTH_RADIUS_KM * c;
};
const getLocation = (ip) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const sanitizedIp = (ip === null || ip === void 0 ? void 0 : ip.trim()) || null;
    const url = sanitizedIp
        ? `https://ipinfo.io/${sanitizedIp}/geo`
        : "https://ipinfo.io/geo";
    try {
        const response = yield axios_1.default.get(url);
        const cityName = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.city) === null || _b === void 0 ? void 0 : _b.trim();
        const rawCoordinates = (_d = (_c = response.data) === null || _c === void 0 ? void 0 : _c.loc) === null || _d === void 0 ? void 0 : _d.trim();
        const coordinates = rawCoordinates && rawCoordinates.includes(",")
            ? (() => {
                const [lat, lon] = rawCoordinates.split(",", 2);
                const latitude = Number.parseFloat(lat);
                const longitude = Number.parseFloat(lon);
                if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                    return { latitude, longitude };
                }
                return null;
            })()
            : null;
        let cities = [];
        try {
            cities = db_1.default.getData(".cities");
        }
        catch (_f) {
            cities = [];
        }
        const coordinatePair = coordinates
            ? [coordinates.latitude, coordinates.longitude]
            : null;
        let match = cityName && cities.length > 0
            ? (_e = cities.find((candidate) => (0, helper_1.isAlmostMatching)(candidate.en_name.toLowerCase(), cityName.toLowerCase()))) !== null && _e !== void 0 ? _e : null
            : null;
        let resolvedCityName = cityName !== null && cityName !== void 0 ? cityName : null;
        if (!match && coordinatePair && cities.length > 0) {
            let closest = null;
            for (const candidate of cities) {
                const distance = getDistanceKm(coordinatePair, candidate.coordinates);
                if (Number.isFinite(distance) &&
                    (closest === null || distance < closest.distance)) {
                    closest = { city: candidate, distance };
                }
            }
            if (closest && closest.distance <= MAX_COORD_DISTANCE_KM) {
                match = closest.city;
                resolvedCityName = closest.city.en_name;
            }
            else if (closest) {
                resolvedCityName = undefined;
            }
        }
        return {
            city: match,
            ip: sanitizedIp,
            cityName: resolvedCityName,
            coordinates,
        };
    }
    catch (error) {
        throw Object.assign(new Error(`Failed to fetch location information for IP: ${sanitizedIp !== null && sanitizedIp !== void 0 ? sanitizedIp : "unknown"}`), { cause: error });
    }
});
exports.getLocation = getLocation;
