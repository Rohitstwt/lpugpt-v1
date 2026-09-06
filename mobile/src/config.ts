import Constants from "expo-constants";

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

/** LPUGPT API — baked in at EAS build via EXPO_PUBLIC_API_URL */
export const API_URL = normalizeUrl(
  process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    "http://localhost:3000"
);
