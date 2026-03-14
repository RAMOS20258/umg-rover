import os
from pathlib import Path

from app.providers.local_sign_provider import LocalSignProvider
from app.providers.manual_adobe_provider import ManualAdobeProvider
from app.providers.uanataca_signbox_provider import UanatacaSignBoxProvider


def get_sign_provider():
    sign_provider = os.getenv("SIGN_PROVIDER", "local_mock").strip().lower()

    if sign_provider == "local_mock":
        return LocalSignProvider()

    if sign_provider == "manual_adobe":
        return ManualAdobeProvider()

    if sign_provider == "uanataca_signbox":
        return UanatacaSignBoxProvider()

    raise ValueError(f"Proveedor de firma no soportado: {sign_provider}")


def sign_credential_pdf(
    pdf_path: Path,
    user_id: str,
    signer_name: str,
    signer_role: str,
):
    provider = get_sign_provider()
    return provider.sign_pdf(
        pdf_path=pdf_path,
        user_id=user_id,
        signer_name=signer_name,
        signer_role=signer_role,
    )