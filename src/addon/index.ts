import CoinGecko from "coingecko-api";
import db from "../db";
import crypto from "./crypto";

const CoinGeckoClient = new CoinGecko();

// забираем постепенно курсы вообще всех существующих криптовалют, затем фильтруем их по капитализации
// оставляем только те что больше 10кк (261шт)
function splitToNChunks(array: string[], n: number) {
  let result = [];
  for (let i = n; i > 0; i--) {
    result.push(array.splice(0, Math.ceil(array.length / i)));
  }
  return result;
}

export const getAllPossibleCryptoRates = async () => {
  const chunks = splitToNChunks(
    crypto.map((c) => c.id),
    300
  );
  chunks.map((chunk, index) => {
    setTimeout(async () => {
      let { data } = await CoinGeckoClient.simple.price({
        ids: chunk.join(","),
        vs_currencies: "usd",
        include_market_cap: true,
      });
      if (data) {
        console.log(Object.keys(data).length);
        db.push(".crypto_rates", data);
        db.save();
      }
    }, index * 20000);
  });
};

// const filtered = Object.entries(crypto_rates).reduce(
//   (res, [id, data]: any) => {
//     if (data.usd_market_cap > 10000000) return { ...res, [id]: data.usd };
//     return res;
//   },
//   {}
// );
// db.push(".filtered", filtered);
// db.save();
// console.log(Object.keys(filtered).length);
