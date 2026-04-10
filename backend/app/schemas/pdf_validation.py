from typing import Optional
from pydantic import BaseModel, Field


class PDFValidationResponse(BaseModel):
    valido: bool = Field(..., description="Indica si la validación fue correcta")
    mensaje: str = Field(..., description="Mensaje descriptivo de la validación")

    credencial_id: Optional[int] = None
    conductor_id: Optional[str] = None

    codigo_validacion: Optional[str] = None
    nombre_conductor: Optional[str] = None
    firmante: Optional[str] = None
    fecha_firma: Optional[str] = None

    estado: Optional[str] = None
    verification_url: Optional[str] = None

    hash_registrado: Optional[str] = None
    hash_pdf: Optional[str] = None
    coincide_hash: Optional[bool] = None

    archivo_pdf: Optional[str] = None
    observaciones: Optional[str] = None


class PDFValidationByCodeResponse(PDFValidationResponse):
    pass


class PDFValidationUploadResponse(PDFValidationResponse):
    pass