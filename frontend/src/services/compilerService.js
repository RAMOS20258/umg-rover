const API = "https://backend-production-793b.up.railway.app";

function getToken() {
  return (
    localStorage.getItem("umg_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token")
  );
}

function buildHeaders(json = false) {
  const token = getToken();
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

export const compilerService = {
  async compile(payload) {
    const res = await fetch(`${API}/compiler/compile`, {
      method: "POST",
      headers: buildHeaders(true),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "No se pudo compilar");
    return data;
  },

  async save(payload) {
    const res = await fetch(`${API}/compiler/save`, {
      method: "POST",
      headers: buildHeaders(true),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "No se pudo guardar");
    return data;
  },

  async getPrograms() {
    const res = await fetch(`${API}/compiler/programs`, {
      headers: buildHeaders(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "No se pudieron cargar programas");
    return data;
  },
};