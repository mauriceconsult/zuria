// lib/geocode.ts
import axios from "axios";

export interface GeoLocation {
  lat: number;
  lng: number;
}

export const geocodeAddress = async (address: string): Promise<GeoLocation> => {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const response = await axios.get(
    "https://maps.googleapis.com/maps/api/geocode/json",
    {
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  );

  if (response.data.status !== "OK") {
    throw new Error(`Geocoding failed: ${response.data.status} — ${address}`);
  }

  const location = response.data.results[0]?.geometry?.location;

  if (!location) {
    throw new Error(`Could not geocode address: ${address}`);
  }

  return { lat: location.lat, lng: location.lng };
};
