import { useRef, useEffect, useMemo, useState } from "react";
import "../styles/simulator.css";

const SCALE = 1.5;
const WHEEL_CIRCUMFERENCE_CM = 10;
const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 380;

function instToCm(inst) {
  switch (inst.instruction) {
    case "avanzar_vlts":
      return (inst.argument || 0) * WHEEL_CIRCUMFERENCE_CM;
    case "avanzar_ctms":
      return inst.argument || 0;
    case "avanzar_mts":
      return (inst.argument || 0) * 100;
    default:
      return 0;
  }
}

function angleFromGirar(argument) {
  if (argument === 1) return 90;
  if (argument === -1) return -90;
  return 0;
}

function buildSteps(instructions = []) {
  const steps = [];

  for (const inst of instructions) {
    if (inst.type === "simple") {
      const { instruction, argument } = inst;

      if (
        ["avanzar_vlts", "avanzar_ctms", "avanzar_mts"].includes(instruction)
      ) {
        steps.push({ cmd: "move", dist: instToCm(inst) * SCALE });
      } else if (instruction === "girar") {
        steps.push({ cmd: "rotate", angle: angleFromGirar(argument) });
      } else if (instruction === "rotar") {
        steps.push({ cmd: "rotate", angle: (argument || 0) * 360 });
      } else if (instruction === "caminar") {
        steps.push({ cmd: "move", dist: (argument || 0) * 15 * SCALE });
      } else if (instruction === "moonwalk") {
        steps.push({ cmd: "move", dist: -(argument || 0) * 15 * SCALE });
      } else if (instruction === "circulo") {
        steps.push({
          cmd: "circle",
          radius: Math.max(1, Math.abs(argument || 0) * SCALE),
        });
      } else if (instruction === "cuadrado") {
        steps.push({
          cmd: "square",
          side: Math.max(1, Math.abs(argument || 0) * SCALE),
        });
      }
    } else if (inst.type === "combined" && Array.isArray(inst.parts)) {
      for (const part of inst.parts) {
        if (part.instruction === "girar") {
          steps.push({ cmd: "rotate", angle: angleFromGirar(part.argument) });
        } else if (part.instruction === "rotar") {
          steps.push({ cmd: "rotate", angle: (part.argument || 0) * 360 });
        } else if (part.instruction === "caminar") {
          steps.push({ cmd: "move", dist: (part.argument || 0) * 15 * SCALE });
        } else if (part.instruction === "moonwalk") {
          steps.push({ cmd: "move", dist: -(part.argument || 0) * 15 * SCALE });
        } else if (part.instruction === "circulo") {
          steps.push({
            cmd: "circle",
            radius: Math.max(1, Math.abs(part.argument || 0) * SCALE),
          });
        } else if (part.instruction === "cuadrado") {
          steps.push({
            cmd: "square",
            side: Math.max(1, Math.abs(part.argument || 0) * SCALE),
          });
        } else {
          const fakeInst = {
            instruction: part.instruction,
            argument: part.argument,
          };
          const dist = instToCm(fakeInst) * SCALE;
          if (dist !== 0) steps.push({ cmd: "move", dist });
        }
      }
    }
  }

  return steps;
}

function estimateBounds(steps) {
  let x = 0;
  let y = 0;
  let angle = -Math.PI / 2;

  const pts = [{ x: 0, y: 0 }];

  for (const step of steps) {
    if (step.cmd === "move") {
      const chunks = Math.max(1, Math.ceil(Math.abs(step.dist) / 8));
      const delta = step.dist / chunks;
      for (let i = 0; i < chunks; i++) {
        x += Math.cos(angle) * delta;
        y += Math.sin(angle) * delta;
        pts.push({ x, y });
      }
    } else if (step.cmd === "rotate") {
      angle += (step.angle * Math.PI) / 180;
    } else if (step.cmd === "circle") {
      const radius = Math.max(1, step.radius);
      const segments = 72;

      const startX = x;
      const startY = y;
      const centerX = startX - Math.cos(angle) * radius;
      const centerY = startY - Math.sin(angle) * radius;
      const baseAngle = Math.atan2(startY - centerY, startX - centerX);

      for (let i = 1; i <= segments; i++) {
        const t = (Math.PI * 2 * i) / segments;
        x = centerX + Math.cos(baseAngle + t) * radius;
        y = centerY + Math.sin(baseAngle + t) * radius;
        pts.push({ x, y });
      }
    } else if (step.cmd === "square") {
      const side = Math.max(1, step.side);
      for (let s = 0; s < 4; s++) {
        const chunks = Math.max(1, Math.ceil(side / 8));
        const delta = side / chunks;
        for (let i = 0; i < chunks; i++) {
          x += Math.cos(angle) * delta;
          y += Math.sin(angle) * delta;
          pts.push({ x, y });
        }
        angle += Math.PI / 2;
      }
    }
  }

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;

  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return { minX, maxX, minY, maxY };
}

export default function Simulator({
  instructions = [],
  isRunning,
  runId = 0,
  onDone,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const lastRunIdRef = useRef(-1);
  const panRef = useRef(null);

  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });

  const [zoomLabel, setZoomLabel] = useState(100);

  const steps = useMemo(() => buildSteps(instructions), [instructions]);
  const bounds = useMemo(() => estimateBounds(steps), [steps]);

  const stateRef = useRef({
    x: 0,
    y: 0,
    angle: -Math.PI / 2,
    trail: [{ x: 0, y: 0 }],
    stepIdx: 0,
    stepProgress: 0,
    steps: [],
    running: false,
    circleMeta: null,
    squareMeta: null,
  });

  const drawFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const s = stateRef.current;
    const zoom = zoomRef.current;
    const offset = offsetRef.current;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    const left = -offset.x / zoom;
    const right = (W - offset.x) / zoom;
    const top = -offset.y / zoom;
    const bottom = (H - offset.y) / zoom;

    const gridSize = 40;
    ctx.strokeStyle = "rgba(0,212,255,0.06)";
    ctx.lineWidth = 1 / zoom;

    const startX = Math.floor(left / gridSize) * gridSize;
    const endX = Math.ceil(right / gridSize) * gridSize;
    const startY = Math.floor(top / gridSize) * gridSize;
    const endY = Math.ceil(bottom / gridSize) * gridSize;

    for (let gx = startX; gx <= endX; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, top);
      ctx.lineTo(gx, bottom);
      ctx.stroke();
    }

    for (let gy = startY; gy <= endY; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(left, gy);
      ctx.lineTo(right, gy);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(0,212,255,0.18)";
    ctx.lineWidth = 1 / zoom;

    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(0, bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(left, 0);
    ctx.lineTo(right, 0);
    ctx.stroke();

    if (s.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(s.trail[0].x, s.trail[0].y);
      for (let i = 1; i < s.trail.length; i++) {
        ctx.lineTo(s.trail[i].x, s.trail[i].y);
      }
      ctx.strokeStyle = "rgba(0,255,157,0.75)";
      ctx.lineWidth = 2 / zoom;
      ctx.shadowColor = "#00ff9d";
      ctx.shadowBlur = 8 / zoom;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const start = s.trail[0];
    if (start) {
      ctx.beginPath();
      ctx.arc(start.x, start.y, 5 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = "#00d4ff";
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = 10 / zoom;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle + Math.PI / 2);

    ctx.fillStyle = "#0a1628";
    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 1.5 / zoom;
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 12 / zoom;

    ctx.beginPath();
    ctx.rect(-12, -18, 24, 30);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#00d4ff";
    ctx.fillRect(-10, -20, 6, 8);
    ctx.fillRect(-10, 12, 6, 8);
    ctx.fillRect(4, -20, 6, 8);
    ctx.fillRect(4, 12, 6, 8);

    ctx.beginPath();
    ctx.arc(0, -8, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff6b00";
    ctx.shadowColor = "#ff6b00";
    ctx.shadowBlur = 8 / zoom;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -26);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, -28, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff";
    ctx.fill();

    ctx.restore();
    ctx.restore();

    ctx.fillStyle = "rgba(0,212,255,0.85)";
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.fillText(`X: ${Math.round(s.x / SCALE)} cm`, 10, 20);
    ctx.fillText(`Y: ${Math.round(-s.y / SCALE)} cm`, 10, 35);
    ctx.fillText(
      `θ: ${Math.round((((s.angle + Math.PI / 2) * 180) / Math.PI + 360) % 360)}°`,
      10,
      50,
    );
    ctx.fillText(`Zoom: ${Math.round(zoom * 100)}%`, 10, 65);
    ctx.fillText(`Pasos: ${s.steps.length}`, 10, 80);
  };

  const fitToRoute = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const padding = 80;
    const width = Math.max(120, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(120, bounds.maxY - bounds.minY + padding * 2);

    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    const nextZoom = Math.max(0.2, Math.min(4, Math.min(scaleX, scaleY)));

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    zoomRef.current = nextZoom;
    offsetRef.current = {
      x: canvas.width / 2 - centerX * nextZoom,
      y: canvas.height / 2 - centerY * nextZoom,
    };
    setZoomLabel(Math.round(nextZoom * 100));
    drawFrame();
  };

  const animate = () => {
    const s = stateRef.current;
    if (!s.running) return;

    if (s.stepIdx >= s.steps.length) {
      s.running = false;
      drawFrame();
      onDone?.();
      return;
    }

    const step = s.steps[s.stepIdx];
    const MOVE_SPEED = 2;
    const ROT_SPEED = 0.05;
    const ARC_SPEED = 0.04;

    if (step.cmd === "move") {
      const total = Math.abs(step.dist);
      const sign = step.dist >= 0 ? 1 : -1;
      const remaining = total - s.stepProgress;
      const delta = Math.min(MOVE_SPEED, remaining);

      s.x += sign * Math.cos(s.angle) * delta;
      s.y += sign * Math.sin(s.angle) * delta;
      s.trail.push({ x: s.x, y: s.y });
      s.stepProgress += delta;

      if (s.stepProgress >= total) {
        s.stepIdx += 1;
        s.stepProgress = 0;
      }
    } else if (step.cmd === "rotate") {
      const totalRad = (step.angle * Math.PI) / 180;
      const remaining = totalRad - s.stepProgress;
      const delta =
        totalRad >= 0
          ? Math.min(ROT_SPEED, remaining)
          : Math.max(-ROT_SPEED, remaining);

      s.angle += delta;
      s.stepProgress += delta;

      if (Math.abs(s.stepProgress) >= Math.abs(totalRad)) {
        s.stepIdx += 1;
        s.stepProgress = 0;
      }
    } else if (step.cmd === "circle") {
      const radius = Math.max(1, step.radius);

      if (!s.circleMeta) {
        const startX = s.x;
        const startY = s.y;
        const centerX = startX - Math.cos(s.angle) * radius;
        const centerY = startY - Math.sin(s.angle) * radius;
        const baseAngle = Math.atan2(startY - centerY, startX - centerX);
        s.circleMeta = { centerX, centerY, baseAngle, radius };
      }

      const totalAngle = Math.PI * 2;
      const delta = Math.min(ARC_SPEED, totalAngle - s.stepProgress);
      s.stepProgress += delta;

      s.x =
        s.circleMeta.centerX +
        Math.cos(s.circleMeta.baseAngle + s.stepProgress) * radius;
      s.y =
        s.circleMeta.centerY +
        Math.sin(s.circleMeta.baseAngle + s.stepProgress) * radius;
      s.trail.push({ x: s.x, y: s.y });

      if (s.stepProgress >= totalAngle) {
        s.stepIdx += 1;
        s.stepProgress = 0;
        s.circleMeta = null;
      }
    } else if (step.cmd === "square") {
      const side = Math.max(1, step.side);

      if (!s.squareMeta) {
        s.squareMeta = { baseAngle: s.angle };
      }

      const currentSide = Math.floor(s.stepProgress / side);

      if (currentSide >= 4) {
        s.stepIdx += 1;
        s.stepProgress = 0;
        s.squareMeta = null;
      } else {
        const sideAngle = s.squareMeta.baseAngle + currentSide * (Math.PI / 2);
        const delta = Math.min(MOVE_SPEED, side - (s.stepProgress % side));

        s.x += Math.cos(sideAngle) * delta;
        s.y += Math.sin(sideAngle) * delta;
        s.trail.push({ x: s.x, y: s.y });
        s.stepProgress += delta;
      }
    }

    drawFrame();
    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    drawFrame();
  }, []);

  useEffect(() => {
    fitToRoute();
  }, [steps]);

  useEffect(() => {
    if (!isRunning || steps.length === 0) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      stateRef.current.running = false;
      drawFrame();
      return;
    }

    if (runId === lastRunIdRef.current) return;
    lastRunIdRef.current = runId;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    stateRef.current = {
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      trail: [{ x: 0, y: 0 }],
      stepIdx: 0,
      stepProgress: 0,
      steps,
      running: true,
      circleMeta: null,
      squareMeta: null,
    };

    fitToRoute();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning, runId, steps]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleReset = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    stateRef.current = {
      x: 0,
      y: 0,
      angle: -Math.PI / 2,
      trail: [{ x: 0, y: 0 }],
      stepIdx: 0,
      stepProgress: 0,
      steps: [],
      running: false,
      circleMeta: null,
      squareMeta: null,
    };

    fitToRoute();
  };

  const handleZoomIn = () => {
    zoomRef.current = Math.min(4, zoomRef.current * 1.2);
    setZoomLabel(Math.round(zoomRef.current * 100));
    drawFrame();
  };

  const handleZoomOut = () => {
    zoomRef.current = Math.max(0.2, zoomRef.current / 1.2);
    setZoomLabel(Math.round(zoomRef.current * 100));
    drawFrame();
  };

  const handleWheel = (e) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoom = zoomRef.current;
    const offset = offsetRef.current;

    const worldX = (mouseX - offset.x) / zoom;
    const worldY = (mouseY - offset.y) / zoom;

    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = Math.max(0.2, Math.min(4, zoom * factor));

    zoomRef.current = nextZoom;
    offsetRef.current = {
      x: mouseX - worldX * nextZoom,
      y: mouseY - worldY * nextZoom,
    };

    setZoomLabel(Math.round(nextZoom * 100));
    drawFrame();
  };

  const handleMouseDown = (e) => {
    panRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: offsetRef.current.x,
      offsetY: offsetRef.current.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!panRef.current) return;

    const dx = e.clientX - panRef.current.mouseX;
    const dy = e.clientY - panRef.current.mouseY;

    offsetRef.current = {
      x: panRef.current.offsetX + dx,
      y: panRef.current.offsetY + dy,
    };
    drawFrame();
  };

  const handleMouseUp = () => {
    panRef.current = null;
  };

  return (
    <div className="simulator-wrap">
      <div
        className="sim-toolbar"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        <span className="label" style={{ margin: 0 }}>
          ÁREA DE SIMULACIÓN — UMG BASIC ROVER 2.0
        </span>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button className="btn btn-sm" onClick={handleZoomOut}>
            － ZOOM
          </button>
          <button className="btn btn-sm" onClick={handleZoomIn}>
            ＋ ZOOM
          </button>
          <button className="btn btn-sm" onClick={fitToRoute}>
            ⛶ AJUSTAR
          </button>
          <button className="btn btn-sm" onClick={handleReset}>
            ↺ RESET
          </button>
        </div>
      </div>

      <div className="sim-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="sim-canvas"
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: panRef.current ? "grabbing" : "grab" }}
        />
      </div>

      {instructions.length === 0 && (
        <div className="sim-empty">
          <div className="sim-empty-icon">🛸</div>
          <p>Compila tu código para ver la simulación del rover</p>
        </div>
      )}
    </div>
  );
}
