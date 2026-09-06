import type { ExpoConfig } from "expo/config";

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

const config: ExpoConfig = {
  name: "LPUGPT",
  slug: "lpugpt",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  backgroundColor: "#0a0a0a",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0a0a0a",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "in.lpu.lpugpt",
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "LPUGPT uses your location for campus navigation and turn-by-turn directions.",
      LSApplicationQueriesSchemes: [
        "comgooglemaps",
        "googlemaps",
        "maps",
        "upi",
        "tez",
        "phonepe",
        "paytmmp",
      ],
    },
  },
  android: {
    package: "in.lpu.lpugpt",
    versionCode: 1,
    softwareKeyboardLayoutMode: "resize",
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundColor: "#0a0a0a",
    },
  },
  plugins: ["expo-secure-store"],
  extra: {
    apiUrl,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
