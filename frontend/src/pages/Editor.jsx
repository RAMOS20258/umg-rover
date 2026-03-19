import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../App";
import CodeEditor from "../components/CodeEditor";
import Simulator from "../components/Simulator";
import Console from "../components/Console";
import Menubar from "../components/Menubar";
import TokenTable from "../components/TokenTable";
import { compilerService } from "../services/compilerService";
import { credentialService } from "../services/credentialService";
import "../styles/editor.css";
import logoUMG from "../assets/avatar-presets/umg/LOGOUMG.png";

const COREOGRAFIAS = [
  {
    name: "🌌 Danza Galáctica",
    code: `PROGRAM DanzaGalactica
BEGIN
    circulo(50);
    rotar(2);
    avanzar_mts(1);
    girar(1) + avanzar_vlts(3);
    circulo(100);
    rotar(-2);
    avanzar_mts(-1);
    moonwalk(5);
    cuadrado(80);
    rotar(1);
END.`,
    song: "Galactic",
  },
  {
    name: "❄️ Exploración Polar",
    code: `PROGRAM ExploracionPolar
BEGIN
    avanzar_mts(2);
    girar(1) + avanzar_ctms(50);
    girar(0) + avanzar_mts(1);
    girar(-1) + avanzar_ctms(80);
    cuadrado(60);
    rotar(3);
    avanzar_vlts(5);
    circulo(40);
    caminar(8);
    moonwalk(3);
END.`,
    song: "Polar",
  },
  {
    name: "💃 Tango del Rover",
    code: `PROGRAM TangoRover
BEGIN
    caminar(3);
    moonwalk(2);
    girar(-1) + avanzar_mts(1) + girar(0) + girar(1) + avanzar_ctms(40);
    rotar(1);
    caminar(-3);
    moonwalk(-2);
    circulo(30);
    cuadrado(50);
    avanzar_vlts(4);
    rotar(-1);
END.`,
    song: "Tango",
  },
];

const DEFAULT_CODE = `PROGRAM MiPrimerRover
BEGIN
    avanzar_mts(2);
    girar(1) + avanzar_vlts(3);
    circulo(50);
    rotar(1);
    cuadrado(80);
END.`;

export default function Editor({ onLogout, onDashboard, onProfile }) {
  const { user } = useAuth();

  const resolveAvatarSrc = (userData) => {
    if (!userData) return null;

    if (userData.avatar_base64) {
      return userData.avatar_base64.startsWith("data:image")
        ? userData.avatar_base64
        : `data:image/png;base64,${userData.avatar_base64}`;
    }

    if (userData.avatar) {
      return userData.avatar.startsWith?.("data:image")
        ? userData.avatar
        : `data:image/png;base64,${userData.avatar}`;
    }

    return null;
  };

  const avatarSrc = resolveAvatarSrc(user);

  const [code, setCode] = useState(DEFAULT_CODE);
  const [compileResult, setCompileResult] = useState(null);
  const [consoleLogs, setConsoleLogs] = useState([
    { type: "info", text: `[SISTEMA] Bienvenido, ${user?.nickname}. UMG Basic Rover 2.0 listo.` },
    { type: "info", text: "[SISTEMA] Editor inicializado. Usa el menú COMPILAR para ejecutar." },
  ]);
  const [activePanel, setActivePanel] = useState("simulator");
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [programs, setPrograms] = useState([]);
  const [showPrograms, setShowPrograms] = useState(false);
  const [sendingCredential, setSendingCredential] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setActivePanel("simulator");
    setIsSimulating(false);
  }, []);

  const addLog = useCallback((type, text) => {
    setConsoleLogs((prev) => [
      ...prev,
      { type, text: `[${new Date().toLocaleTimeString()}] ${text}` },
    ]);
  }, []);

  const handleReenviarCredencial = async () => {
    if (!user?.id) {
      addLog("error", "No hay sesión activa para reenviar la credencial.");
      return;
    }

    setSendingCredential(true);

    try {
      const data = await credentialService.resend(user.id);
      const delivery = data.delivery || {};

      addLog(
        "success",
        `Credencial reenviada. Correo: ${delivery.email || "pendiente"} | WhatsApp: ${
          delivery.whatsapp || "pendiente"
        }`
      );
    } catch (err) {
      addLog("error", err.message || "Error al reenviar credencial");
    } finally {
      setSendingCredential(false);
    }
  };

  const handleDescargarCredencial = () => {
    if (!user?.id) return;
    credentialService.download(user.id);
    addLog("info", "Abriendo credencial PDF...");
  };

  const handleCompile = async ({ simulate = false, execute = false } = {}) => {
    addLog("info", "Iniciando compilación...");
    setCompileResult(null);
    setIsSimulating(false);

    try {
      const payload = {
        code,
        program_name: "programa",
        descripcion: null,
        rover_id: null,
        save_on_success: simulate || execute,
      };

      const data = await compilerService.compile(payload);

      if (data.success) {
        addLog(
          "success",
          `✓ Compilación exitosa — ${data.instructions?.length || 0} instrucción(es)`
        );

        if (data.saved_program_id) {
          addLog("info", `Programa guardado con ID: ${data.saved_program_id}`);
        }

        if (data.simulation_id) {
          addLog("info", `Simulación registrada: ${data.simulation_id}`);
        }

        if (data.tokens?.length) {
          addLog("info", `Tokens generados: ${data.tokens.length}`);
        }

        setCompileResult(data);

        if (simulate || execute) {
          setIsSimulating(true);
          setActivePanel("simulator");
          addLog(
            "info",
            execute
              ? "Transmitiendo instrucciones al UMG Basic Rover 2.0..."
              : "Iniciando simulación de trayectoria..."
          );
        }
      } else {
        (data.errors || []).forEach((e) => addLog("error", e));
        setCompileResult({
          success: false,
          errors: data.errors || [],
          tokens: [],
          instructions: [],
        });
      }
    } catch (err) {
      addLog("error", `Error de compilación/red: ${err.message}`);
    }
  };

  const handleNew = () => {
    setCode(DEFAULT_CODE);
    setCompileResult(null);
    setIsSimulating(false);
    setActivePanel("simulator");
    addLog("info", "Nuevo programa creado.");
  };

  const handleOpen = () => fileInputRef.current?.click();

  const handleFileRead = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCode(ev.target.result);
      setCompileResult(null);
      setIsSimulating(false);
      setActivePanel("simulator");
      addLog("info", `Archivo abierto: ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSave = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "programa.umgpp";
    a.click();
    URL.revokeObjectURL(url);
    addLog("success", "Archivo guardado como .umgpp");
  };

  const handleSaveServer = async () => {
    if (!saveName.trim()) {
      addLog("warn", "Debes indicar un nombre para guardar el programa.");
      return;
    }

    try {
      await compilerService.save({
        code,
        program_name: saveName.trim(),
        descripcion: null,
        rover_id: null,
      });

      addLog("success", `Programa "${saveName}" guardado en servidor.`);
      setShowSaveModal(false);
      setSaveName("");
    } catch (err) {
      addLog("error", err.message || "Error al guardar en servidor.");
    }
  };

  const loadPrograms = async () => {
    try {
      const data = await compilerService.getPrograms();
      setPrograms(Array.isArray(data) ? data : []);
      setShowPrograms(true);
      addLog("info", "Programas del servidor cargados.");
    } catch (err) {
      addLog("error", err.message || "Error al cargar programas.");
    }
  };

  const loadCoreografia = (choreo) => {
    setCode(choreo.code);
    setCompileResult(null);
    setIsSimulating(false);
    setActivePanel("simulator");
    addLog("info", `Coreografía "${choreo.name}" cargada.`);
    addLog("info", `♪ Música: ${choreo.song}`);
  };

  const handlePrint = () => window.print();

  const menuActions = {
    onNew: handleNew,
    onOpen: handleOpen,
    onSave: handleSave,
    onSaveServer: () => setShowSaveModal(true),
    onOpenServer: loadPrograms,
    onPrint: handlePrint,
    onCompile: () => handleCompile({ simulate: false, execute: false }),
    onCompileSimulate: () => handleCompile({ simulate: true, execute: false }),
    onCompileExecute: () => handleCompile({ simulate: true, execute: true }),
    coreografias: COREOGRAFIAS,
    onLoadCoreografia: loadCoreografia,
    onLogout,
    onDashboard,
    onProfile,
    onReenviarCredencial: handleReenviarCredencial,
    onDescargarCredencial: handleDescargarCredencial,
    sendingCredential,
    user,
  };

  return (
    <div className="editor-root">
      <div className="scanline" />

      <div className="editor-topbar">
        <div className="editor-brand">
          <img src={logoUMG} alt="Logo UMG" className="brand-logo" />
          <span className="brand-icon">⬡</span>
          <span className="brand-name">UMG ROVER</span>
          <span className="brand-version">2.0</span>
        </div>

        <Menubar {...menuActions} />

        <div className="editor-user">
          <div className="user-avatar">
            {avatarSrc ? <img src={avatarSrc} alt="avatar" /> : <span>👤</span>}
          </div>

          <div className="user-info">
            <span className="user-nick">{user?.nickname}</span>
            <span className="user-role">{user?.role?.toUpperCase()}</span>
          </div>

          <button className="btn btn-sm btn-danger" onClick={onLogout}>
            EXIT
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-pane">
          <div className="pane-header">
            <span className="status-dot active" />
            <span className="pane-title">EDITOR DE CÓDIGO</span>
            <div className="pane-actions">
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleCompile({ simulate: false, execute: false })}
              >
                ▶ COMPILAR
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleCompile({ simulate: true, execute: false })}
              >
                ⚡ SIMULAR
              </button>
            </div>
          </div>

          <CodeEditor value={code} onChange={setCode} />
        </div>

        <div className="editor-right">
          <div className="tab-bar">
            <button
              className={`tab ${activePanel === "simulator" ? "active" : ""}`}
              onClick={() => setActivePanel("simulator")}
            >
              🗺 SIMULADOR
            </button>
            <button
              className={`tab ${activePanel === "tokens" ? "active" : ""}`}
              onClick={() => setActivePanel("tokens")}
            >
              📋 TOKENS
            </button>
          </div>

          <div className="right-panel">
            {activePanel === "simulator" && (
              <Simulator
                instructions={compileResult?.instructions || []}
                isRunning={isSimulating}
                onDone={() => {
                  setIsSimulating(false);
                  addLog("success", "✓ Simulación completada.");
                }}
              />
            )}

            {activePanel === "tokens" && (
              <TokenTable tokens={compileResult?.tokens || []} />
            )}
          </div>

          <Console logs={consoleLogs} onClear={() => setConsoleLogs([])} />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".umgpp,.txt"
        onChange={handleFileRead}
        style={{ display: "none" }}
      />

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div
            className="modal panel corner-tl corner-br"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">GUARDAR EN SERVIDOR</div>
            <label className="label">NOMBRE DEL PROGRAMA</label>
            <input
              className="input"
              placeholder="MiPrograma"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveServer()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleSaveServer}>
                💾 GUARDAR
              </button>
              <button className="btn" onClick={() => setShowSaveModal(false)}>
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrograms && (
        <div className="modal-overlay" onClick={() => setShowPrograms(false)}>
          <div
            className="modal panel corner-tl corner-br"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 500 }}
          >
            <div className="modal-title">MIS PROGRAMAS</div>
            <div className="programs-list">
              {programs.length === 0 ? (
                <p
                  className="console-text"
                  style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}
                >
                  No hay programas guardados
                </p>
              ) : (
                programs.map((p) => (
                  <div
                    key={p.id}
                    className="program-item"
                    onClick={() => {
                      setCode(p.codigo || p.codigo_actual || "");
                      setShowPrograms(false);
                      setActivePanel("simulator");
                      addLog("info", `Programa "${p.nombre}" cargado.`);
                    }}
                  >
                    <span className="program-name">{p.nombre}</span>
                    <span className="program-date">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              className="btn"
              onClick={() => setShowPrograms(false)}
              style={{ marginTop: 12 }}
            >
              CERRAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}