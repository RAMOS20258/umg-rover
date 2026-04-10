from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, auth, compiler, credentials, evidences, rover
from app.routers import pdf_validation 

app = FastAPI(title="UMG Basic Rover 2.0 API", version="1.2.0")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://frontend-production-54ed.up.railway.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(auth.router)
app.include_router(credentials.router)
app.include_router(compiler.router)
app.include_router(admin.router)
app.include_router(evidences.router)
app.include_router(rover.router)

app.include_router(pdf_validation.router)  # 👈 NUEVO

@app.get("/")
def root():
    return {
        "message": "UMG Basic Rover 2.0 API funcionando",
        "version": "1.2.0"
    }