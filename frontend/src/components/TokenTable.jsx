// TokenTable.jsx
import "../styles/token-table.css";

const TYPE_COLORS = {
  PROGRAM: "tok-reserved", BEGIN: "tok-reserved", END: "tok-reserved", PUNTO: "tok-reserved",
  AVANZAR_VLTS: "tok-command", AVANZAR_CTMS: "tok-command", AVANZAR_MTS: "tok-command",
  GIRAR: "tok-command", CIRCULO: "tok-command", CUADRADO: "tok-command",
  ROTAR: "tok-command", CAMINAR: "tok-command", MOONWALK: "tok-command",
  LPAREN: "tok-paren", RPAREN: "tok-paren",
  INTEGER: "tok-number",
  PLUS: "tok-default", SEMICOLON: "tok-default", DOT: "tok-default",
  IDENTIFIER: "tok-default",
};

const CATEGORIES = {
  PROGRAM: "Palabra Reservada", BEGIN: "Palabra Reservada", END: "Palabra Reservada", PUNTO: "Palabra Reservada",
  AVANZAR_VLTS: "Instrucción", AVANZAR_CTMS: "Instrucción", AVANZAR_MTS: "Instrucción",
  GIRAR: "Instrucción", CIRCULO: "Instrucción", CUADRADO: "Instrucción",
  ROTAR: "Instrucción", CAMINAR: "Instrucción", MOONWALK: "Instrucción",
  LPAREN: "Símbolo", RPAREN: "Símbolo", SEMICOLON: "Símbolo", DOT: "Símbolo",
  PLUS: "Operador", INTEGER: "Literal Entero", IDENTIFIER: "Identificador",
};

export default function TokenTable({ tokens }) {
  if (!tokens || tokens.length === 0) {
    return (
      <div className="token-empty">
        <p>Compila tu código para ver la tabla de tokens</p>
      </div>
    );
  }

  return (
    <div className="token-wrap">
      <div className="token-header">
        <span className="label" style={{ margin: 0 }}>
          TABLA DE TOKENS — {tokens.length} tokens generados
        </span>
      </div>
      <div className="token-table-scroll">
        <table className="token-table">
          <thead>
            <tr>
              <th>#</th>
              <th>TOKEN</th>
              <th>TIPO</th>
              <th>CATEGORÍA</th>
              <th>L</th>
              <th>C</th>
            </tr>
          </thead>
          <tbody>
            {tokens.filter(t => t.type !== "EOF").map((tok, i) => (
              <tr key={i}>
                <td className="tok-dim">{i + 1}</td>
                <td><span className={TYPE_COLORS[tok.type] || "tok-default"}>{tok.value}</span></td>
                <td className="tok-type">{tok.type}</td>
                <td>{CATEGORIES[tok.type] || "-"}</td>
                <td className="tok-dim">{tok.line}</td>
                <td className="tok-dim">{tok.column}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
