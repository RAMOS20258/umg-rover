const API = "https://backend-production-793b.up.railway.app";

function getToken() {
  return (
    localStorage.getItem("umg_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token")
  );
}

function buildHeaders() {
  const token = getToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  }

  return headers;
}

async function getJSON(path) {
  const res = await fetch(`${API}${path}`, {
    method: "GET",
    headers: buildHeaders(),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`);
  }

  return data;
}

export const adminService = {
  getStats: () => getJSON("/admin/stats"),
  getAccesos: () => getJSON("/admin/accesos"),
  getConductores: () => getJSON("/admin/conductores"),
  getEvidencias: () => getJSON("/admin/evidencias"),
  getErrores: () => getJSON("/admin/errores"),
  getCredenciales: () => getJSON("/admin/credenciales"),
};