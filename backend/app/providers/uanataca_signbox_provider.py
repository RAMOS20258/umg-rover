from pathlib import Path

from app.providers.base_sign_provider import BaseSignProvider, SignResult


class UanatacaSignBoxProvider(BaseSignProvider):
    def sign_pdf(
        self,
        pdf_path: Path,
        user_id: str,
        signer_name: str,
        signer_role: str,
    ) -> SignResult:
        raise NotImplementedError(
            "Proveedor Uanataca SignBox aún no configurado. "
            "Cuando tengas credenciales y endpoint, aquí se integrará."
        )