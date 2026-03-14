from pathlib import Path

from app.providers.base_sign_provider import BaseSignProvider, SignResult


class ManualAdobeProvider(BaseSignProvider):
    def sign_pdf(
        self,
        pdf_path: Path,
        user_id: str,
        signer_name: str,
        signer_role: str,
    ) -> SignResult:
        if not pdf_path.exists():
            raise FileNotFoundError(f"No existe el PDF: {pdf_path}")

        reference = f"ADOBE-PENDING-{user_id[:8].upper()}"

        return SignResult(
            {
                "ok": True,
                "status": "pending_manual_signature",
                "provider": "manual_adobe",
                "signed_pdf_path": str(pdf_path),
                "reference": reference,
                "signed_at": None,
                "message": "Documento pendiente de firma manual en Adobe Acrobat Reader",
                "signer_name": signer_name,
                "signer_role": signer_role,
            }
        )