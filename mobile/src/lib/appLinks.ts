import { Linking, Platform } from "react-native";

const LPU_UPI_VPA = "lpu.fees@oksbi";
const LPU_PAYEE_NAME = "Lovely Professional University";

/** Open the device's UPI / payment app chooser (GPay, PhonePe, Paytm, etc.) */
export async function openPaymentApp(opts: {
  amountInr: number;
  note?: string;
  vpa?: string;
  payeeName?: string;
}): Promise<boolean> {
  const amount = opts.amountInr.toFixed(2);
  const pa = encodeURIComponent(opts.vpa ?? LPU_UPI_VPA);
  const pn = encodeURIComponent(opts.payeeName ?? LPU_PAYEE_NAME);
  const tn = encodeURIComponent(opts.note ?? "LPU fee payment");
  const upi = `upi://pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR&tn=${tn}`;

  try {
    const can = await Linking.canOpenURL(upi);
    if (can) {
      await Linking.openURL(upi);
      return true;
    }
  } catch {
    // fall through
  }

  // Android intent fallback
  if (Platform.OS === "android") {
    const intent = `intent://pay?pa=${pa}&pn=${pn}&am=${amount}&cu=INR&tn=${tn}#Intent;scheme=upi;end`;
    try {
      await Linking.openURL(intent);
      return true;
    } catch {
      // fall through
    }
  }

  return false;
}

type LatLng = { lat: number; lng: number; label?: string };

function googleMapsWebUrl(origin: LatLng | null, dest: LatLng): string {
  const d = `${dest.lat},${dest.lng}`;
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${d}&travelmode=walking`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${d}&travelmode=walking`;
}

/** Open Google Maps for walking navigation (app if installed, else browser). */
export async function openGoogleMapsWalking(
  dest: LatLng,
  origin?: LatLng | null
): Promise<void> {
  const web = googleMapsWebUrl(origin ?? null, dest);

  const candidates: string[] = [];

  if (Platform.OS === "ios") {
    if (origin) {
      candidates.push(
        `comgooglemaps://?saddr=${origin.lat},${origin.lng}&daddr=${dest.lat},${dest.lng}&directionsmode=walking`
      );
    } else {
      candidates.push(
        `comgooglemaps://?daddr=${dest.lat},${dest.lng}&directionsmode=walking`
      );
    }
    candidates.push(`maps://?daddr=${dest.lat},${dest.lng}&dirflg=w`);
  } else if (Platform.OS === "android") {
    candidates.push(`google.navigation:q=${dest.lat},${dest.lng}&mode=w`);
    candidates.push(
      `geo:0,0?q=${dest.lat},${dest.lng}(${encodeURIComponent(dest.label || "Destination")})`
    );
  }

  candidates.push(web);

  for (const url of candidates) {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      continue;
    }
  }

  await Linking.openURL(web);
}

/** Open a URL in the system browser (mock ERP portals, receipts, etc.) */
export async function openInBrowser(url: string): Promise<void> {
  await Linking.openURL(url);
}

export function absoluteApiUrl(path: string, apiBase: string): string {
  if (path.startsWith("http")) return path;
  return `${apiBase.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
