/** Empty in dev (Vite proxies /api and /auth to localhost:3000). Set in prod since the
 *  frontend and backend are separate Railway services on different subdomains. */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
