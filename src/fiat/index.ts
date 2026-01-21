import axios from "axios";
import db from "../db";
import { reserved } from "./reserved";

export default async () => {
  const symbols = db.getData(".fiat");
  const url = `${process.env.EXCHANGERATESAPI_URL}&symbols=${symbols}`;

  let fiatToEuro: { [key: string]: number } = reserved;

  try {
    const res = await axios.get(url);
    if (res.data?.rates) {
      fiatToEuro = Object.entries(res.data.rates).reduce(
        (rates, [key, rate]) => {
          return { ...rates, [key]: 1 / (rate as number) };
        },
        {} as { [key: string]: number }
      );
      console.log("✅ Rates fetched from API");
    } else {
      console.log("⚠️ No rates in response, using reserved");
    }
  } catch (e: any) {
    console.log("⚠️ No fiat for today, using reserved..", e?.message || e);
  }

  db.push(".fiat_to_euro", fiatToEuro);
  db.save();
};
