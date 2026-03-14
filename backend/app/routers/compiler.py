import uuid
from fastapi import APIRouter, Depends
from app.core.database import get_db
from app.core.security import get_current_user
from app.models import CompileRequest

router = APIRouter(prefix="/compiler", tags=["compiler"])

@router.post("/compile")
async def compile_code(req: CompileRequest, current_user=Depends(get_current_user)):
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
        return {"success": True, "tokens": [t.__dict__ for t in tokens], "ast": ast, "instructions": result["instructions"], "errors": []}
    except Exception as e:
        return {"success": False, "errors": [str(e)], "tokens": [], "ast": None, "instructions": []}

@router.post("/save")
async def save_program(req: CompileRequest, current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.cursor()
    prog_id = str(uuid.uuid4())
    cursor.execute("""
        INSERT INTO programas (id, conductor_id, nombre, codigo, created_at)
        VALUES (?, ?, ?, ?, GETDATE())
    """, prog_id, current_user["sub"], req.program_name, req.code)
    db.commit()
    return {"message": "Programa guardado", "id": prog_id}

@router.get("/programs")
async def get_programs(current_user=Depends(get_current_user), db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, nombre, codigo, created_at FROM programas
        WHERE conductor_id=? ORDER BY created_at DESC
    """, current_user["sub"])
    rows = cursor.fetchall()
    return [{"id": r[0], "nombre": r[1], "codigo": r[2], "created_at": str(r[3])} for r in rows]
