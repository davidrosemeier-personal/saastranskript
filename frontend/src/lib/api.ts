import { API_BASE } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(`API error ${status}`);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    headers:
      options.body && !(options.body instanceof FormData)
        ? { "content-type": "application/json" }
        : undefined,
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body);
  }
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") ?? "";
  return (contentType.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
};

export async function fetchMe(): Promise<{
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
    if (!res.ok) return null;
    // Must be awaited here, not returned directly: a promise returned (not awaited) from
    // inside a try block is not covered by its catch, so a JSON parse failure would
    // otherwise propagate uncaught to the caller instead of falling through to `catch` below.
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}
