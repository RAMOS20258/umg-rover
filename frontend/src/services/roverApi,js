const API = "https://backend-production-793b.up.railway.app";

export async function getRoverStatus() {
  const res = await fetch(`${API}/api/rover/status`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "No se pudo obtener el estado del rover");
  }

  return data;
}

export async function compileAndRunRover(sourceCode) {
  const res = await fetch(`${API}/api/rover/compile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_code: sourceCode,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Error al compilar para el rover");
  }

  return data;
}

export async function stopRover() {
  const res = await fetch(`${API}/api/rover/stop`, {
    method: "POST",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Error al detener el rover");
  }

  return data;
}

export async function sendManualCommand(cmd) {
  const res = await fetch(`${API}/api/rover/manual-command`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cmd }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || "Error enviando comando manual");
  }

  return data;
}