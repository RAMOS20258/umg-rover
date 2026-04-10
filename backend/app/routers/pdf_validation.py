from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.pdf_validation_service import (
    get_credential_by_code,
    get_credential_by_id,
    validate_record_without_pdf,
    validate_uploaded_pdf_against_record,
)

router = APIRouter(prefix="/pdf-validation", tags=["PDF Validation"])


@router.get("/by-code/{codigo}")
def validate_by_code(codigo: str, db: Session = Depends(get_db)):
    record = get_credential_by_code(db, codigo)

    if not record:
        raise HTTPException(404, "Credencial no encontrada")

    return validate_record_without_pdf(record)


@router.get("/by-id/{credencial_id}")
def validate_by_id(credencial_id: int, db: Session = Depends(get_db)):
    record = get_credential_by_id(db, credencial_id)

    if not record:
        raise HTTPException(404, "Credencial no encontrada")

    return validate_record_without_pdf(record)


@router.post("/upload")
async def validate_uploaded_pdf(
    codigo: str = Form(...),
    pdf_file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not pdf_file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Debe subir un PDF")

    record = get_credential_by_code(db, codigo)

    if not record:
        raise HTTPException(404, "Código no encontrado")

    pdf_bytes = await pdf_file.read()

    return validate_uploaded_pdf_against_record(record, pdf_bytes)