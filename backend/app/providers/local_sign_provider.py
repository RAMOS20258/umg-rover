from datetime import datetime
from pathlib import Path
from shutil import copyfile

from app.providers.base_sign_provider import BaseSignProvider, SignResult


class LocalSignProvider(BaseSignProvider):
    def sign_pdf(
        self,
        pdf_path: Path,
        user_id: str,
        signer_name: str,
        signer_role: str,
    ) -> SignResult:
        if not pdf_path.exists():
            raise FileNotFoundError(f"No existe el PDF: {pdf_path}")

        signed_pdf_path = pdf_path.with_name(f"{pdf_path.stem}_signed_local.pdf")
        copyfile(pdf_path, signed_pdf_path)

        reference = f"LOCAL-{user_id[:8].upper()}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        return SignResult(
            {
                "ok": True,
                "status": "signed_local",
                "provider": "local_mock",
                "signed_pdf_path": str(signed_pdf_path),
                "reference": reference,
                "signed_at": datetime.now().isoformat(),
                "message": "Documento marcado como firmado localmente para pruebas",
                "signer_name": signer_name,
                "signer_role": signer_role,
            }
        )