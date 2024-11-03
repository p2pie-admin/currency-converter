import axios from "axios";
import db from "./db";
import { isAlmostMatching } from "./services/helper";
import { ICity } from "./types/db";

export const getLocation = async (ip: string) => {
  const response = await axios.get(`https://ipinfo.io/${ip}/geo`);

  const cityName = response.data?.city as string | undefined;

  const cities = db.getData(".cities") as ICity[];
  const city = cities.find((city) =>
    isAlmostMatching(city.en_name.toLowerCase(), cityName?.toLowerCase())
  );

  return {
    city,
    ip,
  };
};
