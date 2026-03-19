from typing import Optional
from pydantic import BaseModel


class CompileRequest(BaseModel):
    code: str
    program_name: Optional[str] = "programa"
    descripcion: Optional[str] = None
    rover_id: Optional[str] = None
    save_on_success: Optional[bool] = False