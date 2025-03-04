import Fastify from "fastify";
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
server.get("/", async (req: any, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
  try {
    const location = await getLocation(ip);
    reply.send(location);
  } catch (error) {
    console.error(error);
    reply.status(500).send(
      JSON.stringify({
        text: "Error retrieving location information",
        ip,
        location,
      })
    );
  }
});
// Declare a route

server.get("/:dir/:timeframe?", async (req: any, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  const dirRequested = req?.params?.dir?.toUpperCase() as string;
  const timeframe = req?.params?.timeframe;
  const dayRates = db.getData(`.rates.${dirRequested}`) as number[];
  if (!timeframe) {
    const [give, get] = dirRequested.split("_");
    const currentRate = dayRates[dayRates.length - 1];
    const giveToUSD = db.getData(`.rates.${give}_USD`)[0];
    const getToUSD = db.getData(`.rates.${get}_USD`)[0];
    const dayTrend = ((currentRate - dayRates[0]) / currentRate) * 100;
    const hourTrend =
      ((currentRate - dayRates[dayRates.length - 6]) / currentRate) * 100;
    reply.send({ currentRate, giveToUSD, getToUSD, dayTrend, hourTrend });
    return;
  }
  try {
    const hourRates = dayRates.slice(-1 * 6);
    const image =
      timeframe == "hour"
        ? await createChart(hourRates)
        : await createChart(dayRates.filter((_, i) => i % 5 == 0));
    reply.header("Content-Type", "image/png");
    reply.send(image);
  } catch (error) {
    console.error(error);
    reply.status(500).send("Error generating chart");
  }
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
    setInterval(updateCryptoRates, 1_000 * 60 * 10); // ~ раз 10 мин
    setInterval(updateFiatRates, 11_000_000); // >3h for 250 api calls per month
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};
start();
