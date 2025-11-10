import axios from "axios";
import db from "./db";
import { isAlmostMatching } from "./services/helper";
import { ICity } from "./types/db";

const EARTH_RADIUS_KM = 6371;
const MAX_COORD_DISTANCE_KM = 100;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const getDistanceKm = (a: number[], b: number[]) => {
  if (a.length !== 2 || b.length !== 2) return Number.POSITIVE_INFINITY;
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_KM * c;
};

export const getLocation = async (ip?: string | null) => {
  const sanitizedIp = ip?.trim() || null;
  const url = sanitizedIp
    ? `https://ipinfo.io/${sanitizedIp}/geo`
    : "https://ipinfo.io/geo";

  try {
    const response = await axios.get(url);
    const cityName = (response.data?.city as string | undefined)?.trim();
    const rawCoordinates = (response.data?.loc as string | undefined)?.trim();

    const coordinates =
      rawCoordinates && rawCoordinates.includes(",")
        ? (() => {
            const [lat, lon] = rawCoordinates.split(",", 2);
            const latitude = Number.parseFloat(lat);
            const longitude = Number.parseFloat(lon);
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              return { latitude, longitude };
            }
            return null;
          })()
        : null;

    let cities: ICity[] = [];
    try {
      cities = db.getData(".cities") as ICity[];
    } catch {
      cities = [];
    }

    const coordinatePair = coordinates
      ? [coordinates.latitude, coordinates.longitude]
      : null;

    let match: ICity | null =
      cityName && cities.length > 0
        ? cities.find((candidate) =>
            isAlmostMatching(
              candidate.en_name.toLowerCase(),
              cityName.toLowerCase()
            )
          ) ?? null
        : null;

    let resolvedCityName: string | null | undefined = cityName ?? null;

    if (!match && coordinatePair && cities.length > 0) {
      let closest: { city: ICity; distance: number } | null = null;

      for (const candidate of cities) {
        const distance = getDistanceKm(coordinatePair, candidate.coordinates);
        if (
          Number.isFinite(distance) &&
          (closest === null || distance < closest.distance)
        ) {
          closest = { city: candidate, distance };
        }
      }

      if (closest && closest.distance <= MAX_COORD_DISTANCE_KM) {
        match = closest.city;
        resolvedCityName = closest.city.en_name;
      } else if (closest) {
        resolvedCityName = undefined;
      }
    }

    return {
      city: match,
      ip: sanitizedIp,
      cityName: resolvedCityName,
      coordinates,
    };
  } catch (error) {
    throw Object.assign(
      new Error(
        `Failed to fetch location information for IP: ${sanitizedIp ?? "unknown"}`
      ),
      { cause: error }
    );
  }
};
