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
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const credentialService = {
  download(userId) {
    window.open(`${API}/credenciales/${userId}/download`, "_blank");
  },

  async resend(userId) {
    const res = await fetch(`${API}/credenciales/${userId}/reenviar`, {
      method: "POST",
      headers: buildHeaders(),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "No se pudo reenviar la credencial");
    return data;
  },
};