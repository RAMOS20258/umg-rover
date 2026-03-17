const API = "https://backend-production-793b.up.railway.app";

function saveSession(data) {
  if (!data?.access_token || !data?.user) {
    throw new Error("Respuesta de autenticación inválida");
  }

  localStorage.setItem("umg_token", data.access_token);
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("user_id", data.user.id);
  localStorage.setItem("user_role", data.user.role || "");
  localStorage.setItem("user_data", JSON.stringify(data.user));
}

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || "Error de autenticación");
  }

  return data;
}

export const authService = {
  async login(payload) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await parseResponse(res);
    saveSession(data);
    return data;
  },

  async loginFace(payload) {
    const res = await fetch(`${API}/auth/login-face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await parseResponse(res);
    saveSession(data);
    return data;
  },

  async loginQr(token) {
    const res = await fetch(`${API}/auth/login-qr/${token}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await parseResponse(res);
    saveSession(data);
    return data;
  },

  async register(payload) {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return parseResponse(res);
  },

  clearSession() {
    localStorage.removeItem("umg_user");
    localStorage.removeItem("umg_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_data");
  },
};