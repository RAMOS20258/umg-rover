import { useState, useRef, useEffect } from "react";
import "../styles/menubar.css";

export default function Menubar({
  onNew,
  onOpen,
  onSave,
  onSaveServer,
  onOpenServer,
  onPrint,
  onCompile,
  onCompileSimulate,
  onCompileExecute,
  coreografias = [],
  onLoadCoreografia,
  onLogout,
  onDashboard,
  onProfile,
  onReenviarCredencial,
  onDescargarCredencial,
  sendingCredential = false,
  user,
}) {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(null);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const executeAction = (item) => {
    try {
      if (typeof item.action === "function") {
        item.action();
      } else {
        console.error("item.action no es una función:", item);
      }
    } catch (error) {
      console.error("Error ejecutando acción del menú:", error);
    } finally {
      setOpen(null);
    }
  };

  const renderMenu = (name, items) => (
    <div className="menu-item" key={name}>
      <button
        className={`menu-btn ${open === name ? "active" : ""}`}
        onClick={() => setOpen(open === name ? null : name)}
        type="button"
      >
        {name}
      </button>

      {open === name && (
        <div className="dropdown">
          {items.map((item, i) =>
            item === "---" ? (
              <div key={`${name}-sep-${i}`} className="sep" />
            ) : (
              <button
                key={`${name}-${i}`}
                className="dropdown-item"
                type="button"
                onClick={() => executeAction(item)}
                disabled={!!item.disabled}
                title={item.disabled ? "Opción no disponible" : ""}
              >
                {item.icon && <span className="d-icon">{item.icon}</span>}
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="d-shortcut">{item.shortcut}</span>
                )}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );

  const menus = [
    [
      "ARCHIVO",
      [
        { icon: "📄", label: "Nuevo", action: onNew, shortcut: "Ctrl+N" },
        {
          icon: "📂",
          label: "Abrir (.umgpp)",
          action: onOpen,
          shortcut: "Ctrl+O",
        },
        { icon: "☁️", label: "Abrir del servidor", action: onOpenServer },
        "---",
        {
          icon: "💾",
          label: "Guardar (.umgpp)",
          action: onSave,
          shortcut: "Ctrl+S",
        },
        { icon: "☁️", label: "Guardar en servidor", action: onSaveServer },
        "---",
        { icon: "🖨", label: "Imprimir", action: onPrint, shortcut: "Ctrl+P" },
      ],
    ],
    [
      "EDITAR",
      [
        {
          icon: "📋",
          label: "Copiar",
          action: () => document.execCommand("copy"),
          shortcut: "Ctrl+C",
        },
        {
          icon: "✂️",
          label: "Cortar",
          action: () => document.execCommand("cut"),
          shortcut: "Ctrl+X",
        },
        {
          icon: "📌",
          label: "Pegar",
          action: () => document.execCommand("paste"),
          shortcut: "Ctrl+V",
        },
        "---",
        {
          icon: "🔍",
          label: "Buscar",
          action: () => {
            const q = prompt("Buscar:");
            if (q) window.find(q);
          },
        },
        {
          icon: "🔄",
          label: "Reemplazar",
          action: () => alert("Usa Ctrl+H para reemplazar en tu navegador."),
        },
        "---",
        {
          icon: "☑️",
          label: "Seleccionar todo",
          action: () => document.execCommand("selectAll"),
          shortcut: "Ctrl+A",
        },
      ],
    ],
    [
      "COMPILAR",
      [
        { icon: "▶", label: "Compilar", action: onCompile, shortcut: "F5" },
        {
          icon: "⚡",
          label: "Compilar y Simular",
          action: onCompileSimulate,
          shortcut: "F6",
        },
        {
          icon: "🚀",
          label: "Compilar y Ejecutar",
          action: onCompileExecute,
          shortcut: "F7",
        },
      ],
    ],
    [
      "COREOGRAFÍAS",
      coreografias.length > 0
        ? coreografias.map((c, index) => ({
            icon: "🎵",
            label: c?.name || `Coreografía ${index + 1}`,
            action: () => onLoadCoreografia?.(c),
            disabled: typeof onLoadCoreografia !== "function",
          }))
        : [
            {
              icon: "🎵",
              label: "No hay coreografías disponibles",
              action: null,
              disabled: true,
            },
          ],
    ],
    [
      "CREDENCIAL",
      [
        {
          icon: "🪪",
          label: "Descargar PDF",
          action: onDescargarCredencial,
          disabled: typeof onDescargarCredencial !== "function",
        },
        {
          icon: "📨",
          label: sendingCredential
            ? "Reenviando..."
            : "Reenviar por correo y WhatsApp",
          action: onReenviarCredencial,
          disabled:
            sendingCredential || typeof onReenviarCredencial !== "function",
        },
      ],
    ],
    [
      "PERFIL",
      [
        {
          icon: "🧾",
          label: "Mi perfil / evidencias",
          action: onProfile,
          disabled: typeof onProfile !== "function",
        },
      ],
    ],
    ...(user?.role === "admin" || user?.role === "supervisor"
      ? [
          [
            "ADMIN",
            [
              ...(onDashboard
                ? [{ icon: "📊", label: "Dashboard", action: onDashboard }]
                : []),
              "---",
              { icon: "🚪", label: "Cerrar sesión", action: onLogout },
            ],
          ],
        ]
      : [
          [
            "SESIÓN",
            [{ icon: "🚪", label: "Cerrar sesión", action: onLogout }],
          ],
        ]),
  ];

  return (
    <nav className="menubar" ref={ref}>
      {menus.map(([name, items]) => renderMenu(name, items))}
    </nav>
  );
}
