import { useRef, useEffect, useState } from "react";
import "../styles/code-editor.css";

const RESERVED = new Set(["PROGRAM", "BEGIN", "END", "PUNTO"]);
const COMMANDS  = new Set([
  "avanzar_vlts","avanzar_ctms","avanzar_mts",
  "girar","circulo","cuadrado","rotar","caminar","moonwalk"
]);

function tokenizeLine(line) {
  // Returns array of {text, cls}
  const result = [];
  let i = 0;
  while (i < line.length) {
    // Comments //
    if (line[i] === '/' && line[i+1] === '/') {
      result.push({ text: line.slice(i), cls: "tok-comment" });
      break;
    }
    // Numbers (possibly negative)
    if ((line[i] === '-' && /\d/.test(line[i+1] || '')) || /\d/.test(line[i])) {
      let j = i;
      if (line[j] === '-') j++;
      while (j < line.length && /\d/.test(line[j])) j++;
      result.push({ text: line.slice(i, j), cls: "tok-number" });
      i = j;
      continue;
    }
    // Parens
    if (line[i] === '(' || line[i] === ')') {
      result.push({ text: line[i], cls: "tok-paren" });
      i++;
      continue;
    }
    // Identifiers / keywords
    if (/[a-zA-Z_]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[\w]/.test(line[j])) j++;
      const word = line.slice(i, j);
      let cls = "tok-default";
      if (RESERVED.has(word))  cls = "tok-reserved";
      else if (COMMANDS.has(word)) cls = "tok-command";
      result.push({ text: word, cls });
      i = j;
      continue;
    }
    // Semicolon, plus, dot, spaces
    result.push({ text: line[i], cls: "tok-default" });
    i++;
  }
  return result;
}

function renderHighlighted(line) {
  const parts = tokenizeLine(line);
  return parts.map((p, idx) => (
    <span key={idx} className={p.cls}>{p.text}</span>
  ));
}

export default function CodeEditor({ value, onChange }) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const linesRef = useRef(null);

  const lines = value.split("\n");

  // Sync scroll between textarea and highlight layer
  const syncScroll = () => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (linesRef.current && textareaRef.current) {
      linesRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleKeyDown = (e) => {
    const ta = textareaRef.current;
    if (!ta) return;

    // Tab → 4 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.substring(0, start) + "    " + value.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    }
    // Auto-close parens
    if (e.key === "(") {
      e.preventDefault();
      const start = ta.selectionStart;
      const newVal = value.substring(0, start) + "()" + value.substring(ta.selectionEnd);
      onChange(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 1;
      });
    }
  };

  // Autocomplete suggestion (simple)
  const [suggestion, setSuggestion] = useState(null);
  const handleChange = (e) => {
    onChange(e.target.value);
    // Check last word for suggestion
    const before = e.target.value.slice(0, e.target.selectionStart);
    const m = before.match(/([a-zA-Z_]+)$/);
    if (m) {
      const word = m[1];
      const all = [...RESERVED, ...COMMANDS];
      const match = all.find(w => w.startsWith(word) && w !== word);
      setSuggestion(match ? match.slice(word.length) : null);
    } else {
      setSuggestion(null);
    }
  };

  const applyAutocomplete = () => {
    if (!suggestion) return;
    const ta = textareaRef.current;
    const pos = ta.selectionStart;
    const newVal = value.slice(0, pos) + suggestion + value.slice(pos);
    onChange(newVal);
    setSuggestion(null);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = pos + suggestion.length;
    });
  };

  return (
    <div className="code-editor-wrap">
      {/* Line numbers */}
      <div className="line-numbers" ref={linesRef}>
        {lines.map((_, i) => (
          <div key={i} className="line-num">{i + 1}</div>
        ))}
      </div>

      {/* Editor area */}
      <div className="editor-area">
        {/* Syntax highlight layer */}
        <div className="highlight-layer" ref={highlightRef} aria-hidden="true">
          {lines.map((line, i) => (
            <div key={i} className="hl-line">
              {renderHighlighted(line)}
              {"\n"}
            </div>
          ))}
        </div>

        {/* Actual textarea (transparent) */}
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={value}
          onChange={handleChange}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
        />

        {/* Autocomplete hint */}
        {suggestion && (
          <div className="autocomplete-hint">
            Tab → <span>{suggestion}</span>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="editor-statusbar">
        <span>{lines.length} líneas</span>
        <span>{value.length} caracteres</span>
        <span>UMG++ · UTF-8</span>
        <span className="tok-reserved">RESERVED</span>
        <span className="tok-command">COMMAND</span>
        <span className="tok-paren">PAREN</span>
        <span className="tok-number">NUMBER</span>
      </div>
    </div>
  );
}
