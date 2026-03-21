from datetime import datetime
from typing import Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from compiler.lexer import Lexer, get_token_table
from compiler.parser import Parser
from compiler.semantic import SemanticAnalyzer, transpile_to_python
from compiler.executor import semantic_to_rover_commands

router = APIRouter(prefix="/api/rover", tags=["Rover"])

# Estado global simple para Railway
ROVER_STATE = {
    "current_command": "stop",
    "updated_at": None,
    "queue": [],
    "current_index": 0,
    "running": False,
    "last_compilation": None,
}


class SourceCodeRequest(BaseModel):
    source_code: str


class ManualCommandRequest(BaseModel):
    cmd: str


VALID_COMMANDS = {"forward", "backward", "left", "right", "stop"}


@router.post("/compile")
def compile_umg_code(payload: SourceCodeRequest):
    """
    Compila código UMG++, genera AST, validación semántica,
    transpila a Python y prepara la cola de comandos del rover.
    """
    try:
        if not payload.source_code.strip():
            raise HTTPException(status_code=400, detail="El código fuente está vacío")

        lexer = Lexer(payload.source_code)
        tokens = lexer.tokenize()

        parser = Parser(tokens)
        ast = parser.parse()

        semantic = SemanticAnalyzer(ast)
        semantic_result = semantic.analyze()

        python_code = transpile_to_python(
            semantic_result["instructions"],
            semantic_result["program_name"]
        )

        rover_queue = semantic_to_rover_commands(semantic_result)

        ROVER_STATE["queue"] = rover_queue
        ROVER_STATE["current_index"] = 0
        ROVER_STATE["running"] = len(rover_queue) > 0
        ROVER_STATE["current_command"] = "stop"
        ROVER_STATE["updated_at"] = datetime.utcnow().isoformat() + "Z"
        ROVER_STATE["last_compilation"] = {
            "program_name": semantic_result["program_name"],
            "instructions_count": len(semantic_result["instructions"]),
            "queue_count": len(rover_queue),
        }

        return {
            "ok": True,
            "message": "Código compilado y cola del rover generada",
            "tokens": get_token_table(tokens),
            "ast": ast,
            "semantic": semantic_result,
            "python_code": python_code,
            "queue": rover_queue,
            "state": ROVER_STATE,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/next-command")
def get_next_command():
    """
    Endpoint que consultará el ESP32 en Railway.
    Devuelve el siguiente comando de la cola.
    """
    if not ROVER_STATE["running"] or not ROVER_STATE["queue"]:
        return {
            "ok": True,
            "cmd": "stop",
            "duration_ms": 300,
            "finished": True,
            "index": ROVER_STATE["current_index"],
        }

    if ROVER_STATE["current_index"] >= len(ROVER_STATE["queue"]):
        ROVER_STATE["running"] = False
        ROVER_STATE["current_command"] = "stop"
        ROVER_STATE["updated_at"] = datetime.utcnow().isoformat() + "Z"

        return {
            "ok": True,
            "cmd": "stop",
            "duration_ms": 300,
            "finished": True,
            "index": ROVER_STATE["current_index"],
        }

    command = ROVER_STATE["queue"][ROVER_STATE["current_index"]]
    ROVER_STATE["current_command"] = command["cmd"]
    ROVER_STATE["updated_at"] = datetime.utcnow().isoformat() + "Z"
    ROVER_STATE["current_index"] += 1

    return {
        "ok": True,
        "cmd": command["cmd"],
        "duration_ms": command["duration_ms"],
        "finished": False,
        "index": ROVER_STATE["current_index"] - 1,
        "remaining": len(ROVER_STATE["queue"]) - ROVER_STATE["current_index"],
    }


@router.post("/manual-command")
def set_manual_command(payload: ManualCommandRequest):
    """
    Para pruebas manuales desde tu panel web.
    """
    cmd = payload.cmd.lower().strip()

    if cmd not in VALID_COMMANDS:
        raise HTTPException(status_code=400, detail="Comando inválido")

    ROVER_STATE["queue"] = [{"cmd": cmd, "duration_ms": 500}]
    ROVER_STATE["current_index"] = 0
    ROVER_STATE["running"] = True
    ROVER_STATE["current_command"] = cmd
    ROVER_STATE["updated_at"] = datetime.utcnow().isoformat() + "Z"

    return {
        "ok": True,
        "message": "Comando manual cargado",
        "cmd": cmd,
        "state": ROVER_STATE,
    }


@router.post("/stop")
def stop_rover():
    ROVER_STATE["queue"] = []
    ROVER_STATE["current_index"] = 0
    ROVER_STATE["running"] = False
    ROVER_STATE["current_command"] = "stop"
    ROVER_STATE["updated_at"] = datetime.utcnow().isoformat() + "Z"

    return {
        "ok": True,
        "message": "Rover detenido",
        "cmd": "stop",
    }


@router.get("/status")
def rover_status():
    return {
        "ok": True,
        "state": ROVER_STATE,
    }