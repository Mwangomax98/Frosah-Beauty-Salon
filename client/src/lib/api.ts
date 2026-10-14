// Typed fetch wrapper for /api. Handles the server error shape and attaches the admin token.
// VITE_API_URL points at the API origin when the client is hosted separately (e.g. Vercel + a Node host);
// leave it unset for same-origin deployments (Vite dev proxy / nginx).
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
/** Absolute URL for an API-served path such as "/uploads/images/x.webp". */
export const apiUrl = (path: string) => (path.startsWith("http") ? path : `${API_BASE}${path}`);

export interface ApiErrorShape {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  fields: Record<string, string>;
  constructor(status: number, body: ApiErrorShape) {
    super(body.message || `Request failed (${status})`);
    this.status = status;
    this.code = body.code || "error";
    this.fields = body.fields ?? {};
  }
}

let adminToken: string | null = null;
export function setAdminToken(token: string | null) {
  adminToken = token;
}
export function getAdminToken() {
  return adminToken;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function qs(params?: Query): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function parse(res: Response) {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data as { error?: ApiErrorShape } | null)?.error;
    throw new ApiError(res.status, err ?? { code: `http_${res.status}`, message: res.status === 404 ? "Not found" : text || `Request failed (${res.status})` });
  }
  return data;
}

export async function request<T>(method: string, path: string, body?: unknown, init?: { query?: Query; signal?: AbortSignal }): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}/api${path}${qs(init?.query)}`, { method, headers, body: payload, credentials: "include", signal: init?.signal });
  return (await parse(res)) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>("GET", path, undefined, { query, signal }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>("POST", path, body, { query }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

/** Upload with progress (XHR, because fetch has no upload progress). */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api${path}`);
    xhr.withCredentials = true;
    if (adminToken) xhr.setRequestHeader("Authorization", `Bearer ${adminToken}`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else {
        const err = (data as { error?: ApiErrorShape } | null)?.error;
        reject(new ApiError(xhr.status, err ?? { code: `http_${xhr.status}`, message: "Upload failed" }));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, { code: "network", message: "Network error during upload" }));
    xhr.send(form);
  });
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}
