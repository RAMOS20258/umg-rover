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


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict