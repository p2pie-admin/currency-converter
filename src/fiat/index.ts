import axios from "axios";
import db from "../db";

export default async () => {
  const symbols = db.getData(".fiat");
  const url = `${process.env.EXCHANGERATESAPI_URL}&symbols=${symbols}`;
  try {
    const res = await axios.get(url);
    if (res.data.rates) {
      const rates = res.data.rates as { [key: string]: number };
      const fiatToEuro = Object.entries(rates).reduce((rates, [key, rate]) => {
        return { ...rates, [key]: 1 / rate };
      }, {});
      db.push(".fiat_to_euro", fiatToEuro);
      db.save();
    }
  } catch (e) {
    console.log("no fiat for today..", e);
  }
};
