from typing import Optional
from pydantic import BaseModel


class ResendRequest(BaseModel):
    include_email: bool = True
    include_whatsapp: bool = True


class DeliveryResponse(BaseModel):
    email: str
    whatsapp: str
    credential_url: Optional[str] = None