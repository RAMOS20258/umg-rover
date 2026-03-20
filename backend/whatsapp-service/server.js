const express = require("express");
const QRCode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8080;
const AUTH_ID = process.env.WWEBJS_AUTH_ID || "umg-rover-session";
const SESSION_PATH = process.env.WWEBJS_SESSION_PATH || ".wwebjs_auth";

console.log("Iniciando cliente de WhatsApp...");
console.log("AUTH_ID:", AUTH_ID);
console.log("SESSION_PATH:", SESSION_PATH);

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: AUTH_ID,
    dataPath: SESSION_PATH,
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    timeout: 60000,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
    ],
  },
});

let lastQr = null;
let lastQrImage = null;
let ready = false;
let status = "starting";
let lastError = null;

client.on("loading_screen", (percent, message) => {
  console.log(`Cargando WhatsApp: ${percent}% - ${message}`);
});

client.on("qr", async (qr) => {
  try {
    lastQr = qr;
    lastQrImage = await QRCode.toDataURL(qr);
    ready = false;
    status = "qr";
    lastError = null;
    console.log("QR generado. Abre /qr en el navegador para escanearlo.");
  } catch (err) {
    lastError = err.message || String(err);
    console.error("Error generando imagen QR:", err);
  }
});

client.on("authenticated", () => {
  console.log("WhatsApp autenticado.");
  status = "authenticated";
  lastError = null;
});

client.on("ready", () => {
  ready = true;
  status = "ready";
  lastQr = null;
  lastQrImage = null;
  lastError = null;
  console.log("WhatsApp listo.");
});

client.on("auth_failure", (msg) => {
  ready = false;
  status = "auth_failure";
  lastError = msg || "Fallo de autenticación";
  console.error("Fallo de autenticación:", msg);
});

client.on("disconnected", (reason) => {
  ready = false;
  status = "disconnected";
  lastError = reason || "Cliente desconectado";
  console.log("Cliente desconectado:", reason);
});

client.on("change_state", (state) => {
  console.log("Estado cambiado:", state);
});

client
  .initialize()
  .then(() => {
    console.log("client.initialize() ejecutado correctamente.");
  })
  .catch((err) => {
    status = "init_error";
    lastError = err.message || String(err);
    console.error("Error al inicializar cliente:", err);
  });

function normalizePhone(phone) {
  if (!phone) {
    throw new Error("Número vacío");
  }

  const digits = String(phone).replace(/\D/g, "");
  if (!digits) {
    throw new Error("Número inválido");
  }

  return `${digits}@c.us`;
}

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "umg-rover-whatsapp",
    ready,
    status,
    hasQr: Boolean(lastQrImage),
    error: lastError,
  });
});

app.get("/status", (_req, res) => {
  res.json({
    ok: true,
    ready,
    status,
    hasQr: Boolean(lastQrImage),
    error: lastError,
  });
});

app.get("/qr", (_req, res) => {
  if (ready) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>WhatsApp listo</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .card {
            background: white;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,.1);
            text-align: center;
            max-width: 420px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>WhatsApp ya está listo</h2>
          <p>No necesitas escanear el QR.</p>
          <p><strong>Estado:</strong> ${status}</p>
        </div>
      </body>
      </html>
    `);
  }

  if (!lastQrImage) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>QR no disponible</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>Todavía no hay QR disponible</h2>
        <p>Estado actual: <strong>${status}</strong></p>
        <p>Error: <strong>${lastError || "Ninguno"}</strong></p>
        <p>Recarga esta página en unos segundos.</p>
      </body>
      </html>
    `);
  }

  return res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>QR WhatsApp</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .card {
          background: white;
          padding: 24px;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,.1);
          text-align: center;
          max-width: 420px;
        }
        img {
          max-width: 320px;
          width: 100%;
          height: auto;
          margin-top: 12px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Escanea este QR con WhatsApp</h2>
        <p>Ve a <strong>Dispositivos vinculados</strong> en tu teléfono.</p>
        <img src="${lastQrImage}" alt="QR WhatsApp" />
        <p><strong>Estado:</strong> ${status}</p>
      </div>
    </body>
    </html>
  `);
});

app.post("/send-text", async (req, res) => {
  try {
    if (!ready) {
      return res.status(503).json({
        ok: false,
        message: "WhatsApp todavía no está listo.",
        status,
      });
    }

    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        ok: false,
        message: "phone y message son obligatorios",
      });
    }

    const chatId = normalizePhone(phone);
    const result = await client.sendMessage(chatId, String(message));

    return res.json({
      ok: true,
      id: result?.id?._serialized || null,
      to: phone,
      message: "Mensaje enviado correctamente",
    });
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    return res.status(500).json({
      ok: false,
      message: error.message || "Error interno",
    });
  }
});

app.post("/logout", async (_req, res) => {
  try {
    await client.logout();
    ready = false;
    status = "logged_out";
    lastQr = null;
    lastQrImage = null;

    return res.json({
      ok: true,
      message: "Sesión cerrada correctamente",
    });
  } catch (error) {
    console.error("Error cerrando sesión:", error);
    return res.status(500).json({
      ok: false,
      message: error.message || "No se pudo cerrar la sesión",
    });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp service corriendo en puerto ${PORT}`);
});