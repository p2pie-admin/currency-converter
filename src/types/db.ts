export interface IDB {
  jwt: string;
  crypto_rates: any;
  cities: ICity[];
}

export interface ICity {
  codes: string[];
  en_name: string;
  ru_name: string;
  population: number;
  coordinates: number[];
  preposition: string;
  closest_cities: string[];
  en_country_name: string;
  ru_country_name: string;
}
