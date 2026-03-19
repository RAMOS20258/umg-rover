from typing import Optional
from pydantic import BaseModel

class UserRegister(BaseModel):
    nombres: str
    apellidos: str
    email: str
    email_confirm: str
    phone: str
    phone_confirm: str
    password: str
    password_confirm: str
    nickname: str
    avatar_base64: Optional[str] = None
    face_base64: Optional[str] = None

class UserLogin(BaseModel):
    nickname: str
    password: str

class FaceLoginRequest(BaseModel):
    nickname: str
    face_base64: str

class CompileRequest(BaseModel):
    code: str
    program_name: Optional[str] = "programa"
    descripcion: Optional[str] = None
    rover_id: Optional[str] = None
    save_on_success: Optional[bool] = False

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class DeliveryResponse(BaseModel):
    email: str
    whatsapp: str
    pdf_url: Optional[str] = None

class ResendRequest(BaseModel):
    include_email: bool = True
    include_whatsapp: bool = True