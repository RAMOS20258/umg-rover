from typing import Optional
from pydantic import BaseModel, Field


class EvidenceCreate(BaseModel):
    tipo_evidencia: str = Field(..., description="FOTO, VIDEO, PDF, OTRO")
    nombre_archivo: str
    archivo_base64: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_captura: Optional[str] = None
    es_principal: Optional[bool] = False


class EvidenceResponse(BaseModel):
    id: str
    tipo_evidencia: str
    nombre_archivo: str
    descripcion: Optional[str]
    fecha_subida: str
    es_principal: bool
    estado: str