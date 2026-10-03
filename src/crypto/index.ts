import axios from "axios";
import db from "../db";
import { filterValidRates, isValidRate, matchRates, mergeRates } from "./helpers";

export default async () => {
  const allExist = db.exists(".crypto") && db.exists(".fiat_to_euro");
  if (!allExist) return;
  const crypto = db.getData(".crypto") as { [key: string]: string };
  const fiatToEuro = db.getData(".fiat_to_euro") as { [key: string]: number };
  const ids = Object.keys(crypto).join(",");
  const idList = Object.keys(crypto);
  if (!Object.keys(crypto).length || !Object.keys(fiatToEuro).length) return;
  const now = Date.now();
  const cryptoMetaPath = ".meta.crypto";
  const hasMissingFiatUsdRates = Object.keys(fiatToEuro).some((code) => {
    const normalizedCode = code.toUpperCase();
    return (
      normalizedCode !== "USD" &&
      (!db.exists(`.rates.${normalizedCode}_USD`) ||
        !db.exists(`.rates.USD_${normalizedCode}`))
    );
  });
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
    now - cryptoMeta.lastRequestAt < minIntervalMs &&
    !hasMissingFiatUsdRates
  ) {
    return;
  }

  db.push(cryptoMetaPath, { ...cryptoMeta, lastRequestAt: now });
  try {
    const chunkSize = 200;
    const chunks: string[][] = [];
    for (let i = 0; i < idList.length; i += chunkSize) {
      chunks.push(idList.slice(i, i + chunkSize));
    }

    const combinedData: Record<string, { eur?: number }> = {};
    const errors: string[] = [];
    const baseUrl =
      process.env.COINGECKO_BASE_URL || "https://api.coingecko.com/api/v3";

    for (const chunk of chunks) {
      try {
        const response = await axios.get(`${baseUrl}/simple/price`, {
          params: {
            ids: chunk.join(","),
            vs_currencies: "eur",
          },
          headers: {
            "User-Agent": "p2pie-converter/1.0",
            Accept: "application/json",
          },
          timeout: 10_000,
        });

        if (response?.data && typeof response.data === "object") {
          Object.assign(combinedData, response.data);
        } else {
          errors.push("Unexpected CoinGecko response body");
        }
      } catch (error: any) {
        const status = error?.response?.status;
        const message = error?.response?.data?.error || error?.message;
        errors.push(
          status ? `status ${status}: ${message}` : String(message || error)
        );
      }
      if (chunks.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    if (Object.keys(combinedData).length) {
      const cryptoToEuroRaw = Object.entries(crypto).reduce((res, [id, code]) => {
        const rate = combinedData[id]?.eur;
        if (isValidRate(rate)) {
          res[code] = rate;
        }
        return res;
      }, {} as { [key: string]: number });

      const sanitizedFiatToEuro = filterValidRates(fiatToEuro);
      const cryptoToEuro = filterValidRates(cryptoToEuroRaw);
      const missingCrypto = Object.keys(crypto).filter(
        (id) => !isValidRate(combinedData[id]?.eur)
      );
      const warningParts = [];
      if (missingCrypto.length > 0) {
        const missingCodes = missingCrypto
          .map((id) => crypto[id])
          .filter(Boolean)
          .map((code) => code.toUpperCase());
        const missingLabel =
          missingCodes.length > 20
            ? `${missingCodes.slice(0, 20).join(", ")} (+${
                missingCodes.length - 20
              } more)`
            : missingCodes.join(", ");
        warningParts.push(
          `missing: ${missingCrypto.length}${
            missingLabel ? ` (${missingLabel})` : ""
          }`
        );
      }
      if (errors.length) {
        warningParts.push(`errors: ${errors.length}`);
      }
      const warning = warningParts.length
        ? `Partial CoinGecko rates (${warningParts.join(", ")})`
        : null;

      if (!Object.keys(cryptoToEuro).length || !Object.keys(sanitizedFiatToEuro).length) {
        db.push(cryptoMetaPath, {
          ...cryptoMeta,
          lastRequestAt: now,
          lastError: {
            message: errors.length
              ? `Invalid rates from CoinGecko: ${errors.join("; ")}`
              : "Invalid rates from CoinGecko",
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
        lastError: {
          message: errors.length
            ? `Empty CoinGecko response: ${errors.join("; ")}`
            : "Empty CoinGecko response",
          at: now,
        },
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
