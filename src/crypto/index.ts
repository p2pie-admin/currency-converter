import db from "../db";
import CoinGecko from "coingecko-api";
import { matchRates, mergeRates, roundAmount } from "./helpers";

const CoinGeckoClient = new CoinGecko();

export default async () => {
  const allExist = db.exists(".crypto") && db.exists(".fiat_to_euro");
  if (!allExist) return;
  const crypto = db.getData(".crypto") as { [key: string]: string };
  const fiatToEuro = db.getData(".fiat_to_euro") as { [key: string]: number };
  const ids = Object.keys(crypto).join(",");
  if (!Object.keys(crypto).length || !Object.keys(fiatToEuro).length) return;
  try {
    let { data } = await CoinGeckoClient.simple.price({
      ids,
      vs_currencies: "eur",
    });
    if (data) {
      const cryptoToEuro = Object.entries(crypto).reduce(
        (res, [id, code]) => ({ ...res, [code]: data[id]?.eur }),
        {}
      ) as { [key: string]: number };

      // const cryptoToCryptoRates = Object.entries(cryptoCodesToEur).reduce((rates, [cryptoCode, cryptoToEuro]) => {

      //   return rates
      // } , {})

      const cryptoToFiatRates = matchRates(cryptoToEuro, fiatToEuro);
      const cryptoToCryptoRates = matchRates(cryptoToEuro, cryptoToEuro);
      const fiatToFiatRates = matchRates(fiatToEuro, fiatToEuro);
      const newRates = {
        ...cryptoToFiatRates,
        ...cryptoToCryptoRates,
        ...fiatToFiatRates,
      };

      if (!db.exists(".rates")) {
        const initialRates = Object.entries(newRates).reduce(
          (res, [key, rate]) => ({ ...res, [key]: [rate] }),
          {}
        );
        db.push(".rates", initialRates);
        console.log("rates initiated");
        db.save();
        return;
      }
      const oldRates = db.getData(".rates");
      // console.log("oldRates", Object.keys(oldRates)?.length);
      db.push(".rates", mergeRates(oldRates, newRates, 6 * 24));
      db.save();
    }
  } catch (err) {
    console.log(err);
  }
};
