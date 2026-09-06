import { API_URL } from "./config";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
};

export type ChatBlock = {
  type: string;
  content?: string;
  data?: Record<string, unknown>;
};

export type ChatResponse = {
  reply: string;
  intent?: string;
  blocks?: ChatBlock[];
  error?: string;
};

const REQUEST_TIMEOUT_MS = 45_000;

function networkError(path: string, err: unknown): Error {
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return new Error("Request timed out — server took too long to respond.");
    }
    if (/network request failed|failed to fetch/i.test(err.message)) {
      return new Error(
        `Can't reach LPUGPT at ${API_URL}. Same Wi‑Fi? Backend running?`
      );
    }
    return err;
  }
  return new Error(`Request failed for ${path}`);
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  const hasBody = init.body != null && init.body !== "";
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (data as { error?: string }).error || `Request failed (${res.status})`;
      if (res.status === 401) {
        throw new Error("Session expired — please sign in again.");
      }
      throw new Error(msg);
    }

    return data as T;
  } catch (err) {
    throw networkError(path, err);
  } finally {
    clearTimeout(timeout);
  }
}

export async function pingBackend(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/api/auth/me`, {
      signal: controller.signal,
    });
    clearTimeout(t);
    return res.status !== 502 && res.status !== 503;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string) {
  return request<{ user: User; token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(token: string) {
  return request<{ user: User }>("/api/auth/me", { token });
}

export async function logout(token: string) {
  return request<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
    token,
  });
}

export async function sendChatMessage(token: string, message: string) {
  return request<ChatResponse>("/api/chat", {
    method: "POST",
    token,
    body: JSON.stringify({ message }),
  });
}

export type DirectionsResult = {
  distance: string;
  duration: string;
  distanceMeters: number;
  durationSeconds: number;
  path: Array<{ lat: number; lng: number }>;
  steps: Array<{
    maneuver?: { type?: string; modifier?: string; location?: [number, number] };
    name?: string;
    distance?: number;
    duration?: number;
  }>;
  mapsUrl?: string;
};

export async function fetchDirections(
  token: string | null,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
) {
  const q = `origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
  return request<DirectionsResult>(`/api/maps/directions?${q}`, { token });
}

export async function submitAssignment(
  token: string,
  body: { courseCode: string; fileName?: string }
) {
  return request<{
    ok: boolean;
    label: string;
    status: string;
  }>("/api/mock-erp/assignments/submit", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function applyLeave(
  token: string,
  body: {
    leaveType: string;
    fromDate: string;
    toDate: string;
    reason: string;
  }
) {
  return request<{
    ok: boolean;
    label: string;
    status: string;
  }>("/api/mock-erp/leave/apply", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function payFee(
  token: string,
  body: { feeType?: string; payAll?: boolean }
) {
  const path = body.payAll
    ? "/api/mock-erp/fees/pay-all"
    : "/api/mock-erp/fees/pay";
  return request<{
    ok: boolean;
    txnId?: string;
    feeLabel?: string;
    amountInr?: number;
    paid?: number;
  }>(path, {
    method: "POST",
    token,
    body: body.payAll ? "{}" : JSON.stringify({ feeType: body.feeType }),
  });
}
