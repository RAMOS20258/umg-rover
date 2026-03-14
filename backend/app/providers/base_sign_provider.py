from abc import ABC, abstractmethod
from pathlib import Path


class SignResult(dict):
    pass


class BaseSignProvider(ABC):
    @abstractmethod
    def sign_pdf(
        self,
        pdf_path: Path,
        user_id: str,
        signer_name: str,
        signer_role: str,
    ) -> SignResult:
        raise NotImplementedError