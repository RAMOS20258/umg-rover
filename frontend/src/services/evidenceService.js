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

export const evidenceService = {
  async getMine() {
    const res = await fetch(`${API}/evidencias/mis-evidencias`, {
      headers: buildHeaders(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "No se pudieron cargar las evidencias");
    return data;
  },

  async create(payload) {
    const res = await fetch(`${API}/evidencias/`, {
      method: "POST",
      headers: buildHeaders(true),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "No se pudo guardar la evidencia");
    return data;
  },

  async setPrincipal(id) {
    const res = await fetch(`${API}/evidencias/${id}/principal`, {
      method: "PUT",
      headers: buildHeaders(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "No se pudo actualizar la evidencia principal");
    return data;
  },

  async remove(id) {
    const res = await fetch(`${API}/evidencias/${id}`, {
      method: "DELETE",
      headers: buildHeaders(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "No se pudo eliminar la evidencia");
    return data;
  },
};