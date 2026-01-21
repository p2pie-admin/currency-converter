import Fastify, { FastifyRequest } from "fastify";
import dotenv from "dotenv";
import axios from "axios";
import path from "path";
import updateCryptoRates from "./crypto";
import updateFiatRates from "./fiat";

import db from "./db";
import { createChart } from "./chart";

import auth from "./services/auth";
import callStrapi from "./services/callStrapi";
import { citiesQuery } from "./services/queries";
import { ICity } from "./types/db";
import { getLocation } from "./getLocation";

dotenv.config();

const server = Fastify({
  logger: true,
});

server.addHook("onRequest", async (req, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "GET,OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type");
  reply.header("Cross-Origin-Resource-Policy", "cross-origin");

  if (req.method === "OPTIONS") {
    reply.status(204).send();
  }
});

const normalizeIp = (ip?: string | null) => {
  if (!ip) return null;
  let normalized = ip.trim();

  if (!normalized || normalized.toLowerCase() === "unknown") {
    return null;
  }

  if (normalized.startsWith("::ffff:")) {
    normalized = normalized.replace("::ffff:", "");
  }

  // Remove port from IPv4 addresses (e.g., 192.168.0.1:12345).
  if (normalized.includes(":") && normalized.includes(".")) {
    normalized = normalized.split(":")[0]!;
  }

  if (normalized === "127.0.0.1" || normalized === "::1") {
    return null;
  }

  return normalized;
};

const getClientIp = (req: FastifyRequest): string | null => {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded)
    ? forwarded.find(Boolean)
    : forwarded;

  const fromHeader = forwardedValue
    ?.split(",")
    .map((segment) => segment.trim())
    .find(Boolean);

  const rawIp = fromHeader || req.socket?.remoteAddress || req.ip;

  return normalizeIp(rawIp);
};

const formatLogAt = (value?: number | null) => {
  if (!value || !Number.isFinite(value)) return undefined;
  return new Date(value).toISOString().split("T")[0];
};

const getPairRateInfo = (
  dirRequested: string,
  existingDayRates?: number[] | null
) => {
  const now = Date.now();
  let dayRates = existingDayRates;
  if (!dayRates) {
    try {
      dayRates = db.getData(`.rates.${dirRequested}`) as number[];
    } catch {
      dayRates = null;
    }
  }

  if (!dayRates || dayRates.length === 0) {
    return null;
  }

  const [give, get] = dirRequested.split("_");
  const lastKnownRate =
    [...dayRates].reverse().find((rate) => Number.isFinite(rate) && rate > 0) ??
    null;
  const currentRate = lastKnownRate ?? dayRates[dayRates.length - 1];

  let giveToUSD: number | null = null;
  let getToUSD: number | null = null;

  try {
    giveToUSD = db.getData(`.rates.${give}_USD`)?.[0] ?? null;
  } catch {}
  try {
    getToUSD = db.getData(`.rates.${get}_USD`)?.[0] ?? null;
  } catch {}

  const dayTrend =
    dayRates.length >= 2 && currentRate > 0
      ? ((currentRate - dayRates[0]) / currentRate) * 100
      : null;
  const hourTrend =
    dayRates.length >= 6 && currentRate > 0
      ? ((currentRate - dayRates[dayRates.length - 6]) / currentRate) * 100
      : null;

  let lastRateTimestamp: number | null = null;
  try {
    const timestamps = db.getData(
      `.rates_ts.${dirRequested}`
    ) as number[];
    lastRateTimestamp = timestamps?.[timestamps.length - 1] ?? null;
  } catch {
    lastRateTimestamp = null;
  }

  const issues: Array<{ source: string; reason: string; at?: string }> = [];
  if (!currentRate || !Number.isFinite(currentRate)) {
    issues.push({ source: "rates", reason: "invalid_current_rate" });
  } else if (currentRate !== dayRates[dayRates.length - 1]) {
    issues.push({ source: "rates", reason: "used_last_valid_rate" });
  }
  if (!lastRateTimestamp) {
    issues.push({ source: "rates", reason: "missing_timestamp" });
  } else if (now - lastRateTimestamp > 2 * 60 * 60 * 1000) {
    issues.push({
      source: "rates",
      reason: "stale_rate",
      at: formatLogAt(lastRateTimestamp),
    });
  }

  const meta = db.exists(".meta") ? (db.getData(".meta") as any) : {};
  const fiatMeta = meta?.fiat;
  const cryptoMeta = meta?.crypto;

  if (
    fiatMeta?.lastError &&
    (!fiatMeta?.lastSuccessAt ||
      fiatMeta.lastError.at >= fiatMeta.lastSuccessAt)
  ) {
    issues.push({
      source: "exchangeratesapi",
      reason: fiatMeta.lastError.message || "fiat_rates_error",
      at: formatLogAt(fiatMeta.lastError.at),
    });
  } else if (fiatMeta?.lastWarning) {
    issues.push({
      source: "exchangeratesapi",
      reason: fiatMeta.lastWarning.message || "fiat_rates_warning",
      at: formatLogAt(fiatMeta.lastWarning.at),
    });
  } else if (fiatMeta?.lastSuccessAt && now - fiatMeta.lastSuccessAt > 36 * 60 * 60 * 1000) {
    issues.push({
      source: "exchangeratesapi",
      reason: "fiat_rates_stale",
      at: formatLogAt(fiatMeta.lastSuccessAt),
    });
  }

  if (
    cryptoMeta?.lastError &&
    (!cryptoMeta?.lastSuccessAt ||
      cryptoMeta.lastError.at >= cryptoMeta.lastSuccessAt)
  ) {
    issues.push({
      source: "coingecko",
      reason: cryptoMeta.lastError.message || "crypto_rates_error",
      at: formatLogAt(cryptoMeta.lastError.at),
    });
  } else if (cryptoMeta?.lastWarning) {
    issues.push({
      source: "coingecko",
      reason: cryptoMeta.lastWarning.message || "crypto_rates_warning",
      at: formatLogAt(cryptoMeta.lastWarning.at),
    });
  } else if (cryptoMeta?.lastSuccessAt && now - cryptoMeta.lastSuccessAt > 2 * 60 * 60 * 1000) {
    issues.push({
      source: "coingecko",
      reason: "crypto_rates_stale",
      at: formatLogAt(cryptoMeta.lastSuccessAt),
    });
  }

  const logs: Array<{ source: string; reason: string; at?: string }> = [
    ...issues,
  ];

  if (fiatMeta?.lastSuccessAt) {
    logs.push({
      source: "exchangeratesapi",
      reason: "fiat_rates_updated",
      at: formatLogAt(fiatMeta.lastSuccessAt),
    });
  }

  if (cryptoMeta?.lastSuccessAt) {
    logs.push({
      source: "coingecko",
      reason: "crypto_rates_updated",
      at: formatLogAt(cryptoMeta.lastSuccessAt),
    });
  }

  return {
    currentRate,
    giveToUSD,
    getToUSD,
    dayTrend,
    hourTrend,
    ...(logs.length ? { logs } : {}),
  };
};

server.get("/", async (req: FastifyRequest, reply) => {
  const ip = getClientIp(req);
  try {
    const location = await getLocation(ip);
    const btcRub = getPairRateInfo("BTC_RUB");
    reply.send({ ...location, BTC_RUB: btcRub });
  } catch (error) {
    req.log.error({ err: error, ip }, "IP lookup failed");
    reply.status(502).send({
      text: "Error retrieving location information",
      ip,
    });
  }
});
// Declare a route
server.get("/:dir/:timeframe?", async (req: any, reply) => {
  const dirRequested = req?.params?.dir?.toUpperCase();
  const timeframe = req?.params?.timeframe;

  let dayRates: number[] | null = null;
  try {
    dayRates = db.getData(`.rates.${dirRequested}`) as number[];
  } catch {
    dayRates = null;
  }

  // Chart mode
  if (timeframe === "1h" || timeframe === "24h") {
    const data =
      timeframe === "1h"
        ? dayRates?.slice(-6) ?? null
        : dayRates?.filter((_, i) => i % 5 === 0) ?? null;

    const image = await createChart(data, timeframe);

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
});

const port = +process.env.CONVERTER_PORT!;
console.log("port is: ", port);
// Run the server!
const start = async () => {
  try {
    await server.listen({ port, host: "0.0.0.0" });
    await auth();
    const cities = (await callStrapi(citiesQuery))?.parserSetting
      ?.cities as ICity[];
    if (cities) db.push(".cities", cities);
    getLocation("");
    const isBuiltRuntime = __dirname.includes(`${path.sep}build`);
    if (isBuiltRuntime) {
      console.log("Forced rate update on build startup");
      await updateFiatRates();
      await updateCryptoRates();
      console.log("Forced rate update completed");
    }
    setTimeout(updateFiatRates, 5_000);
    setTimeout(updateCryptoRates, 6_000);
    setInterval(updateCryptoRates, 1_000 * 60 * 30); // every 30min
    setInterval(updateFiatRates, 1_000 * 60 * 60 * 12); // every 12h
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};
start();
