from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# =========================
# MySQL
# =========================
DB_HOST = os.getenv("DB_HOST", "")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# =========================
# Email
# =========================
MAIL_PROVIDER = os.getenv("MAIL_PROVIDER", "smtp").lower()
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME or "no-reply@umgrover.local")
MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "UMG Rover")
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))
MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "true").lower() == "true"
MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "false").lower() == "true"

# =========================
# WhatsApp / Twilio
# =========================
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "")

# =========================
# API base
# =========================
PUBLIC_API_BASE = os.getenv("PUBLIC_API_BASE", "https://backend-production-793b.up.railway.app/")

# =========================
# Railway / entorno
# =========================
IS_RAILWAY = bool(os.getenv("RAILWAY_PROJECT_ID") or os.getenv("RAILWAY_ENVIRONMENT"))

BASE_DIR = Path(__file__).resolve().parents[2]
STORAGE_DIR = BASE_DIR / "storage"
CREDENTIALS_DIR = STORAGE_DIR / "credenciales"
FACES_DIR = STORAGE_DIR / "faces"
EVIDENCES_DIR = STORAGE_DIR / "evidencias"

# En Railway esto puede no ser persistente, pero lo dejamos para funcionamiento base.
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
FACES_DIR.mkdir(parents=True, exist_ok=True)
EVIDENCES_DIR.mkdir(parents=True, exist_ok=True)