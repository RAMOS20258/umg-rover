from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import admin, auth, compiler, credentials

# Crear aplicación
app = FastAPI(
    title="UMG Basic Rover API",
    version="2.0.0",
    description="API del sistema UMG Rover para gestión de credenciales, compilador y autenticación"
)

# Dominios permitidos (CORS)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # dominio del frontend en Railway (agregar cuando se genere)
    "https://frontend-production.up.railway.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(auth.router)
app.include_router(credentials.router)
app.include_router(compiler.router)
app.include_router(admin.router)

# Endpoint principal
@app.get("/")
def root():
    return {
        "message": "UMG Basic Rover API funcionando",
        "version": "2.0.0"
    }

# Endpoint de salud (Railway lo usa para verificar que el servicio está vivo)
@app.get("/health")
def health_check():
    return {"status": "ok"}