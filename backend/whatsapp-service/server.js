const express = require("express");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8080;
const AUTH_ID = process.env.WWEBJS_AUTH_ID || "umg-rover-session";

console.log("Iniciando cliente de WhatsApp...");
console.log("AUTH_ID:", AUTH_ID);

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: AUTH_ID,
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
    ],
  },
});

let lastQr = null;
let ready = false;

client.on("loading_screen", (percent, message) => {
  console.log(`Cargando WhatsApp: ${percent}% - ${message}`);
});

client.on("qr", (qr) => {
  lastQr = qr;
  ready = false;
  console.log("=== ESCANEA ESTE QR EN WHATSAPP ===");
  qrcode.generate(qr, { small: true });
});

client.on("authenticated", () => {
  console.log("WhatsApp autenticado.");
});

client.on("ready", () => {
  ready = true;
  console.log("WhatsApp listo.");
});

client.on("auth_failure", (msg) => {
  ready = false;
  console.error("Fallo de autenticación:", msg);
});

client.on("disconnected", (reason) => {
  ready = false;
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
    hasQr: Boolean(lastQr),
  });
});

app.get("/qr", (_req, res) => {
  if (ready) {
    return res.json({
      ok: true,
      message: "El cliente ya está autenticado y listo.",
    });
  }

  if (!lastQr) {
    return res.status(404).json({
      ok: false,
      message: "Todavía no hay QR disponible. Revisa los logs.",
    });
  }

  return res.json({
    ok: true,
    qr: lastQr,
  });
});

app.post("/send-text", async (req, res) => {
  try {
    if (!ready) {
      return res.status(503).json({
        ok: false,
        message: "WhatsApp todavía no está listo.",
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
    const result = await client.sendMessage(chatId, message);

    return res.json({
      ok: true,
      id: result.id?._serialized || null,
      to: phone,
    });
  } catch (error) {
    console.error("Error enviando mensaje:", error);
    return res.status(500).json({
      ok: false,
      message: error.message || "Error interno",
    });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp service corriendo en puerto ${PORT}`);
});