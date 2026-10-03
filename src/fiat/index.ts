import axios from "axios";
import db from "../db";
import { reserved } from "./reserved";

export default async () => {
  const fiatSymbols = db.getData(".fiat") as string[];
  const reservedSymbols = Object.keys(reserved);
  const missingReservedSymbols = reservedSymbols.filter(
    (symbol) => !fiatSymbols.includes(symbol)
  );
  const symbols = Array.from(new Set([...fiatSymbols, ...reservedSymbols]));
  if (missingReservedSymbols.length) {
    db.push(".fiat", symbols);
  }
  const url = `${process.env.EXCHANGERATESAPI_URL}&symbols=${symbols}`;

  const now = Date.now();
  const fiatMetaPath = ".meta.fiat";
  const fiatMeta = db.exists(fiatMetaPath)
    ? (db.getData(fiatMetaPath) as {
        day?: string;
        count?: number;
        lastRequestAt?: number;
        lastSuccessAt?: number;
        lastError?: { message: string; at: number };
        lastWarning?: { message: string; at: number };
      })
    : {};
  const todayKey = new Date(now).toISOString().slice(0, 10);
  const requestCount = fiatMeta.day === todayKey ? fiatMeta.count ?? 0 : 0;
  if (requestCount >= 3) {
    if (missingReservedSymbols.length) {
      const fiatToEuro = db.exists(".fiat_to_euro")
        ? (db.getData(".fiat_to_euro") as { [key: string]: number })
        : {};
      db.push(".fiat_to_euro", {
        ...fiatToEuro,
        ...missingReservedSymbols.reduce(
          (rates, symbol) => ({ ...rates, [symbol]: reserved[symbol] }),
          {} as { [key: string]: number }
        ),
      });
      db.save();
    }
    return;
  }

  let fiatToEuro: { [key: string]: number } = reserved;

  try {
    db.push(fiatMetaPath, {
      ...fiatMeta,
      day: todayKey,
      count: requestCount + 1,
      lastRequestAt: now,
    });
    const res = await axios.get(url);
    if (res.data?.rates) {
      const parsedRates = Object.entries(res.data.rates).reduce(
        (rates, [key, rate]) => {
          const numericRate = Number(rate);
          if (Number.isFinite(numericRate) && numericRate > 0) {
            return { ...rates, [key]: 1 / numericRate };
          }
          return rates;
        },
        {} as { [key: string]: number }
      );
      fiatToEuro = Object.keys(parsedRates).length ? parsedRates : reserved;
      console.log("✅ Rates fetched from API");
      if (Object.keys(parsedRates).length) {
        db.push(fiatMetaPath, {
          ...fiatMeta,
          day: todayKey,
          count: requestCount + 1,
          lastRequestAt: now,
          lastSuccessAt: now,
          lastError: null,
          lastWarning: null,
        });
      } else {
        db.push(fiatMetaPath, {
          ...fiatMeta,
          day: todayKey,
          count: requestCount + 1,
          lastRequestAt: now,
          lastError: { message: "Invalid rates from API", at: now },
          lastWarning: { message: "Fallback to reserved rates", at: now },
        });
      }
    } else {
      console.log("⚠️ No rates in response, using reserved");
      db.push(fiatMetaPath, {
        ...fiatMeta,
        day: todayKey,
        count: requestCount + 1,
        lastRequestAt: now,
        lastError: { message: "No rates in response", at: now },
      });
    }
  } catch (e: any) {
    console.log("⚠️ No fiat for today, using reserved..", e?.message || e);
    db.push(fiatMetaPath, {
      ...fiatMeta,
      day: todayKey,
      count: requestCount + 1,
      lastRequestAt: now,
      lastError: { message: e?.message || String(e), at: now },
    });
  }

  db.push(".fiat_to_euro", fiatToEuro);
  db.save();
};
