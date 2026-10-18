import { translate } from "./translations.js";

// All calls to the FastAPI backend. Vite sends /api/... to http://127.0.0.1:8002 (see vite.config.js).
const API = "/api";

export function getToken() {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  } catch {
    // private mode: the user simply logs in again next time
  }
}

async function request(method, path, body) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // a file goes as a form (FormData sets its own Content-Type), everything else as JSON
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  const response = await fetch(API + path, {
    method,
    headers,
    body: body === undefined || isForm ? body : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // FastAPI sends {detail: "text"} or {detail: [{msg: "..."}]} for validation errors
    const detail = data?.detail;
    const message = Array.isArray(detail) ? detail.map((d) => d.msg).join(", ") : detail;
    const error = new Error(translate(message || "Хатогӣ рух дод")); // in the site's language when we know the message
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body ?? {}),
  put: (path, body) => request("PUT", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),
  // api.upload("/me/avatar", file)
  upload: (path, file) => {
    const form = new FormData();
    form.append("file", file);
    return request("POST", path, form);
  },
};
