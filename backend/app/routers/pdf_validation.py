from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException

from app.core.database import get_db
from app.services.pdf_validation_service import (
    get_credential_by_code,
    validate_record_without_pdf,
    validate_uploaded_pdf_against_record,
)

router = APIRouter(prefix="/pdf-validation", tags=["PDF Validation"])


# ===============================
# 🔎 VALIDAR SOLO POR CÓDIGO
# ===============================
@router.get("/by-code/{codigo}")
def validate_by_code(codigo: str, db=Depends(get_db)):
    codigo = (codigo or "").strip()

    if not codigo:
        raise HTTPException(status_code=400, detail="Debe proporcionar un código válido")

    record = get_credential_by_code(db, codigo)

    if not record:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")

    return validate_record_without_pdf(record)


# ===============================
# 📂 VALIDAR SUBIENDO PDF
# ===============================
@router.post("/upload")
async def validate_pdf(
    codigo: str = Form(...),
    pdf_file: UploadFile = File(...),
    db=Depends(get_db),
):
    codigo = (codigo or "").strip()

    if not codigo:
        raise HTTPException(status_code=400, detail="Debe proporcionar un código válido")

    if not pdf_file or not pdf_file.filename:
        raise HTTPException(status_code=400, detail="Debe subir un archivo PDF")

    if not pdf_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Debe subir un archivo PDF")

    record = get_credential_by_code(db, codigo)

    if not record:
        raise HTTPException(status_code=404, detail="Código no encontrado")

    pdf_bytes = await pdf_file.read()

    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="El archivo PDF está vacío")

    return validate_uploaded_pdf_against_record(record, pdf_bytes)