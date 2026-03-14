"""
UMG++ Lexer - Analizador Léxico
Tokeniza el código fuente UMG++
"""

import re
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum, auto


class TokenType(Enum):
    # Palabras reservadas
    PROGRAM   = "PROGRAM"
    BEGIN     = "BEGIN"
    END       = "END"
    PUNTO     = "PUNTO"

    # Instrucciones de movimiento
    AVANZAR_VLTS  = "avanzar_vlts"
    AVANZAR_CTMS  = "avanzar_ctms"
    AVANZAR_MTS   = "avanzar_mts"
    GIRAR         = "girar"
    CIRCULO       = "circulo"
    CUADRADO      = "cuadrado"
    ROTAR         = "rotar"
    CAMINAR       = "caminar"
    MOONWALK      = "moonwalk"

    # Símbolos
    LPAREN    = "("
    RPAREN    = ")"
    SEMICOLON = ";"
    PLUS      = "+"
    DOT       = "."

    # Literales
    INTEGER   = "INTEGER"
    IDENTIFIER= "IDENTIFIER"

    # Especiales
    NEWLINE   = "NEWLINE"
    EOF       = "EOF"
    UNKNOWN   = "UNKNOWN"


@dataclass
class Token:
    type: TokenType
    value: str
    line: int
    column: int

    def __repr__(self):
        return f"Token({self.type.name}, '{self.value}', L{self.line}:C{self.column})"

    def to_dict(self):
        return {
            "type": self.type.name,
            "value": self.value,
            "line": self.line,
            "column": self.column
        }


# Keywords y tokens del lenguaje
RESERVED_WORDS = {
    "PROGRAM":       TokenType.PROGRAM,
    "BEGIN":         TokenType.BEGIN,
    "END":           TokenType.END,
    "PUNTO":         TokenType.PUNTO,
    "avanzar_vlts":  TokenType.AVANZAR_VLTS,
    "avanzar_ctms":  TokenType.AVANZAR_CTMS,
    "avanzar_mts":   TokenType.AVANZAR_MTS,
    "girar":         TokenType.GIRAR,
    "circulo":       TokenType.CIRCULO,
    "cuadrado":      TokenType.CUADRADO,
    "rotar":         TokenType.ROTAR,
    "caminar":       TokenType.CAMINAR,
    "moonwalk":      TokenType.MOONWALK,
}

SYMBOLS = {
    "(":  TokenType.LPAREN,
    ")":  TokenType.RPAREN,
    ";":  TokenType.SEMICOLON,
    "+":  TokenType.PLUS,
    ".":  TokenType.DOT,
}


class LexerError(Exception):
    def __init__(self, message, line, column):
        super().__init__(f"Error léxico en L{line}:C{column} → {message}")
        self.line = line
        self.column = column


class Lexer:
    def __init__(self, source_code: str):
        self.source = source_code
        self.pos = 0
        self.line = 1
        self.column = 1
        self.tokens: List[Token] = []
        self.errors: List[str] = []

    def current_char(self) -> Optional[str]:
        if self.pos < len(self.source):
            return self.source[self.pos]
        return None

    def peek(self, offset=1) -> Optional[str]:
        idx = self.pos + offset
        if idx < len(self.source):
            return self.source[idx]
        return None

    def advance(self):
        ch = self.source[self.pos]
        self.pos += 1
        if ch == '\n':
            self.line += 1
            self.column = 1
        else:
            self.column += 1
        return ch

    def skip_whitespace(self):
        while self.current_char() and self.current_char() in ' \t\r\n':
            self.advance()

    def skip_comment(self):
        # Comentarios // hasta fin de línea
        if self.current_char() == '/' and self.peek() == '/':
            while self.current_char() and self.current_char() != '\n':
                self.advance()
        # Comentarios /* ... */
        elif self.current_char() == '/' and self.peek() == '*':
            self.advance(); self.advance()
            while self.current_char():
                if self.current_char() == '*' and self.peek() == '/':
                    self.advance(); self.advance()
                    break
                self.advance()

    def read_identifier(self) -> Token:
        start_col = self.column
        start_line = self.line
        result = ""
        while self.current_char() and (self.current_char().isalnum() or self.current_char() == '_'):
            result += self.advance()

        token_type = RESERVED_WORDS.get(result, TokenType.IDENTIFIER)
        return Token(token_type, result, start_line, start_col)

    def read_integer(self) -> Token:
        start_col = self.column
        start_line = self.line
        result = ""
        # Handle negative numbers
        if self.current_char() == '-':
            result += self.advance()
        while self.current_char() and self.current_char().isdigit():
            result += self.advance()
        if result == '-':
            raise LexerError("Se esperaba un dígito después de '-'", start_line, start_col)
        return Token(TokenType.INTEGER, result, start_line, start_col)

    def tokenize(self) -> List[Token]:
        while True:
            self.skip_whitespace()

            # Skip comments
            if self.current_char() == '/' and (self.peek() == '/' or self.peek() == '*'):
                self.skip_comment()
                continue

            if self.current_char() is None:
                self.tokens.append(Token(TokenType.EOF, "EOF", self.line, self.column))
                break

            ch = self.current_char()

            # Symbol tokens
            if ch in SYMBOLS:
                tok = Token(SYMBOLS[ch], ch, self.line, self.column)
                self.advance()
                self.tokens.append(tok)
                continue

            # Negative integer: handle '-' before digit
            if ch == '-' and self.peek() and self.peek().isdigit():
                self.tokens.append(self.read_integer())
                continue

            # Identifiers / keywords
            if ch.isalpha() or ch == '_':
                self.tokens.append(self.read_identifier())
                continue

            # Integers
            if ch.isdigit():
                self.tokens.append(self.read_integer())
                continue

            # Unknown char
            err_msg = f"Carácter desconocido '{ch}'"
            self.errors.append(LexerError(err_msg, self.line, self.column))
            tok = Token(TokenType.UNKNOWN, ch, self.line, self.column)
            self.tokens.append(tok)
            self.advance()

        if self.errors:
            raise Exception("\n".join(str(e) for e in self.errors))

        return self.tokens


# ─── Token table for display ────────────────────────────────
def get_token_table(tokens: List[Token]) -> List[dict]:
    """Returns formatted token table for UI display"""
    categories = {
        "PROGRAM": "Palabra Reservada",
        "BEGIN": "Palabra Reservada",
        "END": "Palabra Reservada",
        "PUNTO": "Palabra Reservada",
        "AVANZAR_VLTS": "Instrucción",
        "AVANZAR_CTMS": "Instrucción",
        "AVANZAR_MTS": "Instrucción",
        "GIRAR": "Instrucción",
        "CIRCULO": "Instrucción",
        "CUADRADO": "Instrucción",
        "ROTAR": "Instrucción",
        "CAMINAR": "Instrucción",
        "MOONWALK": "Instrucción",
        "LPAREN": "Símbolo",
        "RPAREN": "Símbolo",
        "SEMICOLON": "Símbolo",
        "PLUS": "Operador",
        "DOT": "Símbolo",
        "INTEGER": "Literal Entero",
        "IDENTIFIER": "Identificador",
        "EOF": "Fin de Archivo",
    }
    return [
        {
            "no": i + 1,
            "token": t.value,
            "tipo": t.type.name,
            "categoria": categories.get(t.type.name, "Otro"),
            "linea": t.line,
            "columna": t.column,
        }
        for i, t in enumerate(tokens)
        if t.type != TokenType.EOF
    ]
