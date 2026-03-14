"""
UMG++ Parser - Analizador Sintáctico
Gramática BNF:

<programa>       ::= PROGRAM <id> BEGIN <lista_inst> END "."
<lista_inst>     ::= <instruccion> ";" { <instruccion> ";" }
<instruccion>    ::= <inst_simple> | <inst_combinada>
<inst_simple>    ::= avanzar_vlts "(" <entero> ")"
                   | avanzar_ctms "(" <entero> ")"
                   | avanzar_mts  "(" <entero> ")"
                   | circulo      "(" <entero> ")"
                   | cuadrado     "(" <entero> ")"
                   | rotar        "(" <entero> ")"
                   | caminar      "(" <entero> ")"
                   | moonwalk     "(" <entero> ")"
<inst_combinada> ::= <inst_girar> { "+" <inst_girar_o_avanzar> }
<inst_girar>     ::= girar "(" <entero> ")"
<entero>         ::= ["-"] DIGIT+
"""

from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from compiler.lexer import Token, TokenType


# ─── AST Nodes ───────────────────────────────────────────
@dataclass
class ASTNode:
    node_type: str

    def to_dict(self) -> Dict:
        return {"node_type": self.node_type}


@dataclass
class ProgramNode(ASTNode):
    name: str
    body: List[ASTNode]

    def __post_init__(self):
        self.node_type = "Program"

    def to_dict(self):
        return {
            "node_type": self.node_type,
            "name": self.name,
            "body": [s.to_dict() for s in self.body]
        }


@dataclass
class InstruccionSimpleNode(ASTNode):
    instruction: str
    argument: int

    def __post_init__(self):
        self.node_type = "InstruccionSimple"

    def to_dict(self):
        return {
            "node_type": self.node_type,
            "instruction": self.instruction,
            "argument": self.argument
        }


@dataclass
class InstruccionCombNode(ASTNode):
    parts: List[ASTNode]  # girar + avanzar + ...

    def __post_init__(self):
        self.node_type = "InstruccionCombinada"

    def to_dict(self):
        return {
            "node_type": self.node_type,
            "parts": [p.to_dict() for p in self.parts]
        }


# ─── Parser ──────────────────────────────────────────────
class ParseError(Exception):
    def __init__(self, message, line=0, column=0):
        super().__init__(f"Error sintáctico en L{line}:C{column} → {message}")
        self.line = line
        self.column = column


MOVE_INSTRUCTIONS = {
    TokenType.AVANZAR_VLTS,
    TokenType.AVANZAR_CTMS,
    TokenType.AVANZAR_MTS,
    TokenType.CIRCULO,
    TokenType.CUADRADO,
    TokenType.ROTAR,
    TokenType.CAMINAR,
    TokenType.MOONWALK,
}


class Parser:
    def __init__(self, tokens: List[Token]):
        self.tokens = tokens
        self.pos = 0

    def current(self) -> Token:
        return self.tokens[self.pos]

    def peek(self, offset=1) -> Token:
        idx = self.pos + offset
        if idx < len(self.tokens):
            return self.tokens[idx]
        return self.tokens[-1]  # EOF

    def advance(self) -> Token:
        tok = self.tokens[self.pos]
        if self.pos < len(self.tokens) - 1:
            self.pos += 1
        return tok

    def expect(self, token_type: TokenType) -> Token:
        tok = self.current()
        if tok.type != token_type:
            raise ParseError(
                f"Se esperaba '{token_type.value}' pero se encontró '{tok.value}'",
                tok.line, tok.column
            )
        return self.advance()

    def parse(self) -> Dict:
        """Parse and return AST as dict"""
        program = self.parse_program()
        return program.to_dict()

    def parse_program(self) -> ProgramNode:
        # PROGRAM <name>
        self.expect(TokenType.PROGRAM)
        name_tok = self.expect(TokenType.IDENTIFIER)

        # BEGIN
        self.expect(TokenType.BEGIN)

        # <lista_instrucciones>
        body = []
        while self.current().type not in (TokenType.END, TokenType.EOF):
            inst = self.parse_instruccion()
            self.expect(TokenType.SEMICOLON)
            body.append(inst)

        if not body:
            raise ParseError("El programa debe contener al menos una instrucción",
                             self.current().line, self.current().column)

        # END.
        self.expect(TokenType.END)
        self.expect(TokenType.DOT)

        return ProgramNode(node_type="Program", name=name_tok.value, body=body)

    def parse_instruccion(self) -> ASTNode:
        tok = self.current()

        # Instrucción combinada (empieza con girar)
        if tok.type == TokenType.GIRAR:
            return self.parse_instruccion_combinada()

        # Instrucción simple
        if tok.type in MOVE_INSTRUCTIONS:
            return self.parse_instruccion_simple()

        raise ParseError(
            f"Instrucción desconocida '{tok.value}'",
            tok.line, tok.column
        )

    def parse_instruccion_simple(self) -> InstruccionSimpleNode:
        inst_tok = self.advance()
        self.expect(TokenType.LPAREN)
        arg = self.parse_integer()
        self.expect(TokenType.RPAREN)
        return InstruccionSimpleNode(
            node_type="InstruccionSimple",
            instruction=inst_tok.value,
            argument=arg
        )

    def parse_instruccion_combinada(self) -> InstruccionCombNode:
        parts = []

        # First girar
        parts.append(self.parse_girar())

        # + (girar | avanzar)*
        while self.current().type == TokenType.PLUS:
            self.advance()  # consume '+'
            tok = self.current()
            if tok.type == TokenType.GIRAR:
                parts.append(self.parse_girar())
            elif tok.type in MOVE_INSTRUCTIONS:
                parts.append(self.parse_instruccion_simple())
            else:
                raise ParseError(
                    f"Se esperaba una instrucción de movimiento o girar, se encontró '{tok.value}'",
                    tok.line, tok.column
                )

        return InstruccionCombNode(node_type="InstruccionCombinada", parts=parts)

    def parse_girar(self) -> InstruccionSimpleNode:
        self.expect(TokenType.GIRAR)
        self.expect(TokenType.LPAREN)
        arg = self.parse_integer()
        self.expect(TokenType.RPAREN)
        return InstruccionSimpleNode(
            node_type="InstruccionSimple",
            instruction="girar",
            argument=arg
        )

    def parse_integer(self) -> int:
        tok = self.current()
        if tok.type == TokenType.INTEGER:
            self.advance()
            return int(tok.value)
        raise ParseError(
            f"Se esperaba un entero, se encontró '{tok.value}'",
            tok.line, tok.column
        )
