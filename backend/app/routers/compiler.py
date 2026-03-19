import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.compiler import CompileRequest
from app.services.audit_service import log_audit
from app.services.permission_service import ensure_module_permission

router = APIRouter(prefix="/compiler", tags=["compiler"])


def _get_client_meta(request: Request):
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return ip_address, user_agent


def _save_compiler_error(
    db,
    programa_id: str | None,
    conductor_id: str,
    tipo_error: str,
    mensaje_error: str,
    fragmento_codigo: str | None = None,
    linea: int | None = None,
    columna_error: int | None = None,
    simulacion_id: str | None = None,
    ejecucion_id: str | None = None,
    codigo_error: str | None = None,
    severidad: str = "MEDIA",
):
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO errores_compilador (
            id,
            programa_id,
            conductor_id,
            simulacion_id,
            ejecucion_id,
            linea,
            columna_error,
            tipo_error,
            codigo_error,
            mensaje_error,
            fragmento_codigo,
            severidad,
            fecha_error
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """,
        (
            str(uuid.uuid4()),
            programa_id,
            conductor_id,
            simulacion_id,
            ejecucion_id,
            linea,
            columna_error,
            tipo_error,
            codigo_error,
            mensaje_error,
            fragmento_codigo,
            severidad,
        ),
    )


def _insert_program(
    db,
    conductor_id: str,
    nombre: str,
    codigo_actual: str,
    descripcion: str | None = None,
    rover_id: str | None = None,
    estado: str = "BORRADOR",
    lenguaje: str = "UMG_BASIC",
):
    programa_id = str(uuid.uuid4())
    cursor = db.cursor()

    cursor.execute(
        """
        INSERT INTO programas (
            id,
            conductor_id,
            rover_id,
            nombre,
            descripcion,
            codigo_actual,
            lenguaje,
            version_actual,
            es_publico,
            is_coreografia,
            estado,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, 1, 0, 0, %s, NOW())
        """,
        (
            programa_id,
            conductor_id,
            rover_id,
            nombre,
            descripcion,
            codigo_actual,
            lenguaje,
            estado,
        ),
    )

    cursor.execute(
        """
        INSERT INTO versiones_programa (
            id,
            programa_id,
            numero_version,
            codigo_fuente,
            comentario,
            created_at,
            creado_por
        )
        VALUES (%s, %s, 1, %s, %s, NOW(), %s)
        """,
        (
            str(uuid.uuid4()),
            programa_id,
            codigo_actual,
            "Versión inicial del programa",
            conductor_id,
        ),
    )

    return programa_id


def _create_simulation(
    db,
    programa_id: str,
    conductor_id: str,
    exito: bool,
    salida_log: str | None,
    errores: str | None,
):
    simulacion_id = str(uuid.uuid4())
    cursor = db.cursor()

    cursor.execute(
        """
        INSERT INTO simulaciones (
            id,
            programa_id,
            conductor_id,
            exito,
            salida_log,
            errores,
            created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """,
        (
            simulacion_id,
            programa_id,
            conductor_id,
            1 if exito else 0,
            salida_log,
            errores,
        ),
    )

    return simulacion_id


@router.post("/compile")
async def compile_code(
    req: CompileRequest,
    request: Request,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "simulador", "ejecutar")

    programa_id = None
    simulacion_id = None
    ip_address, user_agent = _get_client_meta(request)

    try:
        from compiler.lexer import Lexer
        from compiler.parser import Parser
        from compiler.semantic import SemanticAnalyzer

        lexer = Lexer(req.code)
        tokens = lexer.tokenize()

        parser = Parser(tokens)
        ast = parser.parse()

        semantic = SemanticAnalyzer(ast)
        result = semantic.analyze()

        instructions = result.get("instructions", [])

        if req.save_on_success:
            ensure_module_permission(db, current_user, "programas", "crear")

            programa_id = _insert_program(
                db=db,
                conductor_id=current_user["sub"],
                nombre=req.program_name or "programa",
                descripcion=req.descripcion,
                codigo_actual=req.code,
                rover_id=req.rover_id,
                estado="COMPILADO",
            )

            simulacion_id = _create_simulation(
                db=db,
                programa_id=programa_id,
                conductor_id=current_user["sub"],
                exito=True,
                salida_log="Compilación y análisis semántico exitosos",
                errores=None,
            )

            log_audit(
                db=db,
                conductor_id=current_user["sub"],
                tabla_afectada="programas",
                registro_id=programa_id,
                accion="INSERT",
                datos_nuevos={
                    "id": programa_id,
                    "nombre": req.program_name or "programa",
                    "estado": "COMPILADO",
                    "rover_id": req.rover_id,
                },
                ip_address=ip_address,
                user_agent=user_agent,
                observaciones="Programa creado desde compilación exitosa",
            )

            db.commit()

        return {
            "success": True,
            "tokens": [t.__dict__ for t in tokens],
            "ast": ast,
            "instructions": instructions,
            "errors": [],
            "saved_program_id": programa_id,
            "simulation_id": simulacion_id,
        }

    except Exception as e:
        error_message = str(e)

        try:
            if req.save_on_success:
                ensure_module_permission(db, current_user, "programas", "crear")

                programa_id = _insert_program(
                    db=db,
                    conductor_id=current_user["sub"],
                    nombre=req.program_name or "programa",
                    descripcion=req.descripcion,
                    codigo_actual=req.code,
                    rover_id=req.rover_id,
                    estado="ERROR",
                )

                simulacion_id = _create_simulation(
                    db=db,
                    programa_id=programa_id,
                    conductor_id=current_user["sub"],
                    exito=False,
                    salida_log=None,
                    errores=error_message,
                )

                _save_compiler_error(
                    db=db,
                    programa_id=programa_id,
                    conductor_id=current_user["sub"],
                    simulacion_id=simulacion_id,
                    tipo_error="EJECUCION",
                    mensaje_error=error_message,
                    fragmento_codigo=req.code,
                    severidad="ALTA",
                )

                log_audit(
                    db=db,
                    conductor_id=current_user["sub"],
                    tabla_afectada="errores_compilador",
                    registro_id=programa_id,
                    accion="INSERT",
                    datos_nuevos={
                        "programa_id": programa_id,
                        "mensaje_error": error_message,
                    },
                    ip_address=ip_address,
                    user_agent=user_agent,
                    observaciones="Error registrado desde compilación",
                )

                db.commit()

        except Exception:
            db.rollback()

        return {
            "success": False,
            "errors": [error_message],
            "tokens": [],
            "ast": None,
            "instructions": [],
            "saved_program_id": programa_id,
            "simulation_id": simulacion_id,
        }


@router.post("/save")
async def save_program(
    req: CompileRequest,
    request: Request,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "programas", "crear")

    ip_address, user_agent = _get_client_meta(request)

    try:
        programa_id = _insert_program(
            db=db,
            conductor_id=current_user["sub"],
            nombre=req.program_name or "programa",
            descripcion=req.descripcion,
            codigo_actual=req.code,
            rover_id=req.rover_id,
            estado="BORRADOR",
        )

        log_audit(
            db=db,
            conductor_id=current_user["sub"],
            tabla_afectada="programas",
            registro_id=programa_id,
            accion="INSERT",
            datos_nuevos={
                "id": programa_id,
                "nombre": req.program_name or "programa",
                "estado": "BORRADOR",
                "rover_id": req.rover_id,
            },
            ip_address=ip_address,
            user_agent=user_agent,
            observaciones="Programa guardado manualmente",
        )

        db.commit()
        return {"message": "Programa guardado", "id": programa_id}

    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"No se pudo guardar el programa: {exc}")


@router.get("/programs")
async def get_programs(current_user=Depends(get_current_user), db=Depends(get_db)):
    ensure_module_permission(db, current_user, "programas", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT
            p.id,
            p.nombre,
            p.descripcion,
            p.codigo_actual,
            p.estado,
            p.version_actual,
            p.rover_id,
            p.created_at,
            p.updated_at
        FROM programas p
        WHERE p.conductor_id = %s
        ORDER BY p.created_at DESC
        """,
        (current_user["sub"],),
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "nombre": r[1],
            "descripcion": r[2],
            "codigo": r[3],
            "codigo_actual": r[3],
            "estado": r[4],
            "version_actual": r[5],
            "rover_id": r[6],
            "created_at": str(r[7]),
            "updated_at": str(r[8]) if r[8] else None,
        }
        for r in rows
    ]


@router.get("/programs/{program_id}/versions")
async def get_program_versions(
    program_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "programas", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id
        FROM programas
        WHERE id = %s AND conductor_id = %s
        LIMIT 1
        """,
        (program_id, current_user["sub"]),
    )
    own_program = cursor.fetchone()

    if not own_program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    cursor.execute(
        """
        SELECT
            vp.id,
            vp.numero_version,
            vp.codigo_fuente,
            vp.comentario,
            vp.created_at,
            vp.creado_por
        FROM versiones_programa vp
        WHERE vp.programa_id = %s
        ORDER BY vp.numero_version DESC
        """,
        (program_id,),
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "numero_version": r[1],
            "codigo_fuente": r[2],
            "comentario": r[3],
            "created_at": str(r[4]),
            "creado_por": r[5],
        }
        for r in rows
    ]


@router.get("/programs/{program_id}/errors")
async def get_program_errors(
    program_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "programas", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id
        FROM programas
        WHERE id = %s AND conductor_id = %s
        LIMIT 1
        """,
        (program_id, current_user["sub"]),
    )
    own_program = cursor.fetchone()

    if not own_program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    cursor.execute(
        """
        SELECT
            ec.id,
            ec.tipo_error,
            ec.codigo_error,
            ec.mensaje_error,
            ec.linea,
            ec.columna_error,
            ec.severidad,
            ec.fecha_error
        FROM errores_compilador ec
        WHERE ec.programa_id = %s
        ORDER BY ec.fecha_error DESC
        """,
        (program_id,),
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "tipo_error": r[1],
            "codigo_error": r[2],
            "mensaje_error": r[3],
            "linea": r[4],
            "columna_error": r[5],
            "severidad": r[6],
            "fecha_error": str(r[7]),
        }
        for r in rows
    ]


@router.get("/programs/{program_id}/simulations")
async def get_program_simulations(
    program_id: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    ensure_module_permission(db, current_user, "simulador", "ver")

    cursor = db.cursor()
    cursor.execute(
        """
        SELECT id
        FROM programas
        WHERE id = %s AND conductor_id = %s
        LIMIT 1
        """,
        (program_id, current_user["sub"]),
    )
    own_program = cursor.fetchone()

    if not own_program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    cursor.execute(
        """
        SELECT
            s.id,
            s.exito,
            s.tiempo_estimado_seg,
            s.recorrido_estimado_m,
            s.consumo_estimado_bateria,
            s.salida_log,
            s.errores,
            s.created_at
        FROM simulaciones s
        WHERE s.programa_id = %s
        ORDER BY s.created_at DESC
        """,
        (program_id,),
    )
    rows = cursor.fetchall()

    return [
        {
            "id": r[0],
            "exito": bool(r[1]),
            "tiempo_estimado_seg": r[2],
            "recorrido_estimado_m": float(r[3]) if r[3] is not None else None,
            "consumo_estimado_bateria": float(r[4]) if r[4] is not None else None,
            "salida_log": r[5],
            "errores": r[6],
            "created_at": str(r[7]),
        }
        for r in rows
    ]