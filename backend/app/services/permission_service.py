from fastapi import HTTPException


def has_module_permission(db, role_name: str, module_name: str, permission_name: str) -> bool:
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT rp.permitido
        FROM rol_permisos rp
        INNER JOIN roles r ON r.id = rp.rol_id
        INNER JOIN modulos m ON m.id = rp.modulo_id
        INNER JOIN permisos p ON p.id = rp.permiso_id
        WHERE r.nombre = %s
          AND m.nombre = %s
          AND p.nombre = %s
        LIMIT 1
        """,
        (role_name, module_name, permission_name),
    )
    row = cursor.fetchone()
    return bool(row and row[0] == 1)


def ensure_module_permission(db, current_user: dict, module_name: str, permission_name: str):
    role_name = current_user.get("role")

    if not role_name:
        raise HTTPException(status_code=403, detail="Rol no disponible en el token")

    if role_name == "admin":
        return True

    if not has_module_permission(db, role_name, module_name, permission_name):
        raise HTTPException(
            status_code=403,
            detail=f"No tienes permiso '{permission_name}' en el módulo '{module_name}'",
        )

    return True


def ensure_owner_or_admin(current_user: dict, resource_owner_id: str):
    if current_user.get("role") == "admin":
        return True

    if current_user.get("sub") != resource_owner_id:
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para acceder a este recurso",
        )

    return True