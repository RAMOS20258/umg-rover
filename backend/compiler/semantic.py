"""
UMG++ Semantic Analyzer - Analizador Semántico
Valida:
  - n != 0 para avanzar_vlts, avanzar_ctms, avanzar_mts, rotar, caminar, moonwalk
  - n en {-1, 0, 1} para girar
  - r en [10..200] para circulo
  - l en [10..200] para cuadrado
Genera lista de instrucciones para el simulador
"""

from typing import Dict, Any, List, Tuple


class SemanticError(Exception):
    def __init__(self, message: str):
        super().__init__(f"Error semántico → {message}")


# Reglas semánticas por instrucción
RULES = {
    "avanzar_vlts": {"nonzero": True},
    "avanzar_ctms": {"nonzero": True},
    "avanzar_mts":  {"nonzero": True},
    "girar":        {"values": [-1, 0, 1]},
    "circulo":      {"range": (10, 200)},
    "cuadrado":     {"range": (10, 200)},
    "rotar":        {"nonzero": True},
    "caminar":      {"nonzero": True},
    "moonwalk":     {"nonzero": True},
}


class SemanticAnalyzer:
    def __init__(self, ast: Dict):
        self.ast = ast
        self.errors: List[str] = []
        self.instructions: List[Dict] = []
        self.symbol_table: Dict = {}

    def analyze(self) -> Dict:
        if self.ast["node_type"] != "Program":
            raise SemanticError("El AST no representa un programa válido")

        self.symbol_table["program_name"] = self.ast["name"]

        for stmt in self.ast["body"]:
            self._analyze_stmt(stmt)

        if self.errors:
            raise Exception("\n".join(self.errors))

        return {
            "instructions": self.instructions,
            "symbol_table": self.symbol_table,
            "program_name": self.ast["name"]
        }

    def _analyze_stmt(self, stmt: Dict):
        if stmt["node_type"] == "InstruccionSimple":
            self._validate_instruction(stmt["instruction"], stmt["argument"])
            self.instructions.append({
                "type": "simple",
                "instruction": stmt["instruction"],
                "argument": stmt["argument"]
            })

        elif stmt["node_type"] == "InstruccionCombinada":
            combined = []
            for part in stmt["parts"]:
                self._validate_instruction(part["instruction"], part["argument"])
                combined.append({
                    "instruction": part["instruction"],
                    "argument": part["argument"]
                })
            self.instructions.append({
                "type": "combined",
                "parts": combined
            })

    def _validate_instruction(self, name: str, value: int):
        rules = RULES.get(name)
        if not rules:
            self.errors.append(f"Instrucción desconocida: '{name}'")
            return

        if "nonzero" in rules and value == 0:
            self.errors.append(
                f"El argumento de '{name}' debe ser diferente de 0"
            )

        if "values" in rules and value not in rules["values"]:
            self.errors.append(
                f"El argumento de '{name}' debe ser {rules['values']}, se recibió {value}"
            )

        if "range" in rules:
            lo, hi = rules["range"]
            if not (lo <= value <= hi):
                self.errors.append(
                    f"El argumento de '{name}' debe estar entre {lo} y {hi}, se recibió {value}"
                )


# ─── Transpiler: UMG++ → Python ────────────────────────────
def transpile_to_python(instructions: List[Dict], program_name: str) -> str:
    lines = [
        f"# Programa: {program_name}",
        "# Transpilado desde UMG++ a Python",
        "# UMG Basic Rover 2.0 - 2026",
        "",
        "import time",
        "",
        "def avanzar_vlts(n):",
        "    direction = 'adelante' if n > 0 else 'atras'",
        "    print(f'Avanzar {abs(n)} vuelta(s) {direction}')",
        "",
        "def avanzar_ctms(n):",
        "    direction = 'adelante' if n > 0 else 'atras'",
        "    print(f'Avanzar {abs(n)} cm {direction}')",
        "",
        "def avanzar_mts(n):",
        "    direction = 'adelante' if n > 0 else 'atras'",
        "    print(f'Avanzar {abs(n)} m {direction}')",
        "",
        "def girar(n):",
        "    if n == 1: print('Girar DERECHA (motor izquierdo)')",
        "    elif n == -1: print('Girar IZQUIERDA (motor derecho)')",
        "    else: print('Avanzar RECTO (ambos motores)')",
        "",
        "def circulo(r):",
        "    print(f'Dibujar círculo radio={r}cm')",
        "",
        "def cuadrado(l):",
        "    print(f'Dibujar cuadrado lado={l}cm')",
        "",
        "def rotar(n):",
        "    direction = 'derecha' if n > 0 else 'izquierda'",
        "    print(f'Rotar {abs(n)} vuelta(s) {direction}')",
        "",
        "def caminar(n):",
        "    direction = 'adelante' if n > 0 else 'atras'",
        "    print(f'Caminar {abs(n)} paso(s) {direction}')",
        "",
        "def moonwalk(n):",
        "    direction = 'adelante' if n > 0 else 'atras'",
        "    print(f'Moonwalk {abs(n)} paso(s) {direction}')",
        "",
        f"def main_{program_name}():",
    ]

    for inst in instructions:
        if inst["type"] == "simple":
            lines.append(f"    {inst['instruction']}({inst['argument']})")
        elif inst["type"] == "combined":
            for part in inst["parts"]:
                lines.append(f"    {part['instruction']}({part['argument']})")

    lines.append("")
    lines.append(f"main_{program_name}()")
    return "\n".join(lines)
