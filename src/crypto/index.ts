import db from "../db";
import CoinGecko from "coingecko-api";
import { filterValidRates, isValidRate, matchRates, mergeRates } from "./helpers";

const CoinGeckoClient = new CoinGecko();

export default async () => {
  const allExist = db.exists(".crypto") && db.exists(".fiat_to_euro");
  if (!allExist) return;
  const crypto = db.getData(".crypto") as { [key: string]: string };
  const fiatToEuro = db.getData(".fiat_to_euro") as { [key: string]: number };
  const ids = Object.keys(crypto).join(",");
  if (!Object.keys(crypto).length || !Object.keys(fiatToEuro).length) return;
  const now = Date.now();
  const cryptoMetaPath = ".meta.crypto";
  const cryptoMeta = db.exists(cryptoMetaPath)
    ? (db.getData(cryptoMetaPath) as {
        lastRequestAt?: number;
        lastSuccessAt?: number;
        lastError?: { message: string; at: number };
        lastWarning?: { message: string; at: number };
      })
    : {};
  const minIntervalMs = 10 * 60 * 1000;

  if (
    cryptoMeta.lastRequestAt &&
    now - cryptoMeta.lastRequestAt < minIntervalMs
  ) {
    return;
  }

  db.push(cryptoMetaPath, { ...cryptoMeta, lastRequestAt: now });
  try {
    let { data } = await CoinGeckoClient.simple.price({
      ids,
      vs_currencies: "eur",
    });
    if (data) {
      const cryptoToEuroRaw = Object.entries(crypto).reduce((res, [id, code]) => {
        const rate = data[id]?.eur;
        if (isValidRate(rate)) {
          res[code] = rate;
        }
        return res;
      }, {} as { [key: string]: number });

      const sanitizedFiatToEuro = filterValidRates(fiatToEuro);
      const cryptoToEuro = filterValidRates(cryptoToEuroRaw);
      const missingCrypto = Object.keys(crypto).filter(
        (id) => !isValidRate(data[id]?.eur)
      );
      const warning =
        missingCrypto.length > 0
          ? `Partial CoinGecko rates (missing: ${missingCrypto.length})`
          : null;

      if (!Object.keys(cryptoToEuro).length || !Object.keys(sanitizedFiatToEuro).length) {
        db.push(cryptoMetaPath, {
          ...cryptoMeta,
          lastRequestAt: now,
          lastError: {
            message: "Invalid rates from CoinGecko",
            at: now,
          },
        });
        return;
      }

      // const cryptoToCryptoRates = Object.entries(cryptoCodesToEur).reduce((rates, [cryptoCode, cryptoToEuro]) => {

      //   return rates
      // } , {})

      const cryptoToFiatRates = matchRates(cryptoToEuro, sanitizedFiatToEuro);
      const cryptoToCryptoRates = matchRates(cryptoToEuro, cryptoToEuro);
      const fiatToFiatRates = matchRates(
        sanitizedFiatToEuro,
        sanitizedFiatToEuro
      );
      const newRates = {
        ...cryptoToFiatRates,
        ...cryptoToCryptoRates,
        ...fiatToFiatRates,
      };
      const newRateTimestamps = Object.keys(newRates).reduce(
        (res, key) => ({ ...res, [key]: now }),
        {} as { [key: string]: number }
      );

      if (!db.exists(".rates")) {
        const initialRates = Object.entries(newRates).reduce(
          (res, [key, rate]) => ({ ...res, [key]: [rate] }),
          {}
        );
        const initialRateTimestamps = Object.entries(newRateTimestamps).reduce(
          (res, [key, timestamp]) => ({ ...res, [key]: [timestamp] }),
          {}
        );
        db.push(".rates", initialRates);
        db.push(".rates_ts", initialRateTimestamps);
        console.log("rates initiated");
        db.push(cryptoMetaPath, {
          ...cryptoMeta,
          lastRequestAt: now,
          lastSuccessAt: now,
          lastError: null,
          lastWarning: warning ? { message: warning, at: now } : null,
        });
        db.save();
        return;
      }
      const oldRates = db.getData(".rates");
      const oldRateTimestamps = db.exists(".rates_ts")
        ? db.getData(".rates_ts")
        : {};
      db.push(".rates", mergeRates(oldRates, newRates, 6 * 24));
      db.push(".rates_ts", mergeRates(oldRateTimestamps, newRateTimestamps, 6 * 24));
      db.push(cryptoMetaPath, {
        ...cryptoMeta,
        lastRequestAt: now,
        lastSuccessAt: now,
        lastError: null,
        lastWarning: warning ? { message: warning, at: now } : null,
      });
      db.save();
    } else {
      db.push(cryptoMetaPath, {
        ...cryptoMeta,
        lastRequestAt: now,
        lastError: { message: "Empty CoinGecko response", at: now },
      });
    }
  } catch (err) {
    db.push(cryptoMetaPath, {
      ...cryptoMeta,
      lastRequestAt: now,
      lastError: { message: String(err), at: now },
    });
    console.log(err);
  }
};
