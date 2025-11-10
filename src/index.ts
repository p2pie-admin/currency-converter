import Fastify, { FastifyRequest } from "fastify";
import dotenv from "dotenv";
import axios from "axios";
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

server.get("/", async (req: FastifyRequest, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  const ip = getClientIp(req);
  try {
    const location = await getLocation(ip);
    reply.send(location);
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
  reply.header("Access-Control-Allow-Origin", "*");
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
  if (!dayRates || dayRates.length === 0) {
    reply.send(null);
    return;
  }

  const [give, get] = dirRequested.split("_");
  const currentRate = dayRates[dayRates.length - 1];

  let giveToUSD: number | null = null;
  let getToUSD: number | null = null;

  try {
    giveToUSD = db.getData(`.rates.${give}_USD`)?.[0] ?? null;
  } catch {}
  try {
    getToUSD = db.getData(`.rates.${get}_USD`)?.[0] ?? null;
  } catch {}

  const dayTrend = ((currentRate - dayRates[0]) / currentRate) * 100;
  const hourTrend =
    ((currentRate - dayRates[dayRates.length - 6]) / currentRate) * 100;

  reply.send({ currentRate, giveToUSD, getToUSD, dayTrend, hourTrend });
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
