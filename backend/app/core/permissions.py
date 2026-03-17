from fastapi import Depends
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.permission_service import ensure_module_permission


def require_module_permission(module_name: str, permission_name: str):
    def dependency(
        current_user=Depends(get_current_user),
        db=Depends(get_db),
    ):
        ensure_module_permission(db, current_user, module_name, permission_name)
        return current_user

    return dependency