const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export function getApiBaseUrl(): string {
  return BASE_URL + "/api";
}
