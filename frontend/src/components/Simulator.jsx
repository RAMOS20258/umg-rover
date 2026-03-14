import { useRef, useEffect, useCallback } from "react";
import "../styles/simulator.css";

// Conversion helpers (all to "pixels" for canvas)
const SCALE = 1.5; // 1cm = 1.5px
const WHEEL_CIRCUMFERENCE_CM = 10; // 1 vuelta = 10cm

function instToCm(inst) {
  switch (inst.instruction) {
    case "avanzar_vlts":  return inst.argument * WHEEL_CIRCUMFERENCE_CM;
    case "avanzar_ctms":  return inst.argument;
    case "avanzar_mts":   return inst.argument * 100;
    default: return 0;
  }
}

// Build animation steps from instructions
function buildSteps(instructions) {
  const steps = [];
  for (const inst of instructions) {
    if (inst.type === "simple") {
      const { instruction, argument } = inst;
      if (["avanzar_vlts","avanzar_ctms","avanzar_mts"].includes(instruction)) {
        steps.push({ cmd: "move", dist: instToCm(inst) * SCALE });
      } else if (instruction === "girar") {
        const angle = argument === 1 ? 90 : argument === -1 ? -90 : 0;
        steps.push({ cmd: "rotate", angle });
      } else if (instruction === "circulo") {
        steps.push({ cmd: "circle", radius: argument * SCALE });
      } else if (instruction === "cuadrado") {
        steps.push({ cmd: "square", side: argument * SCALE });
      } else if (instruction === "rotar") {
        steps.push({ cmd: "rotate", angle: argument * 360 });
      } else if (instruction === "caminar") {
        steps.push({ cmd: "move", dist: argument * 15 * SCALE });
      } else if (instruction === "moonwalk") {
        steps.push({ cmd: "moonwalk", dist: argument * 15 * SCALE });
      }
    } else if (inst.type === "combined") {
      // Combine: apply girar then moves
      for (const part of inst.parts) {
        if (part.instruction === "girar") {
          const angle = part.argument === 1 ? 90 : part.argument === -1 ? -90 : 0;
          steps.push({ cmd: "rotate", angle });
        } else {
          const fakeInst = { instruction: part.instruction, argument: part.argument };
          const dist = instToCm(fakeInst) * SCALE;
          if (dist !== 0) steps.push({ cmd: "move", dist });
        }
      }
    }
  }
  return steps;
}

export default function Simulator({ instructions, isRunning, onDone }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const stateRef = useRef({
    x: 0, y: 0, angle: -Math.PI / 2,
    trail: [], stepIdx: 0, stepProgress: 0,
    steps: [], running: false
  });

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const s = stateRef.current;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = "rgba(0,212,255,0.06)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let gx = cx % gridSize; gx < W; gx += gridSize) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = cy % gridSize; gy < H; gy += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "rgba(0,212,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

    // Trail
    if (s.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(cx + s.trail[0].x, cy + s.trail[0].y);
      for (let i = 1; i < s.trail.length; i++) {
        ctx.lineTo(cx + s.trail[i].x, cy + s.trail[i].y);
      }
      ctx.strokeStyle = "rgba(0,255,157,0.6)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00ff9d";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Start marker
    if (s.trail.length > 0) {
      const tp = s.trail[0];
      ctx.beginPath();
      ctx.arc(cx + tp.x, cy + tp.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#00d4ff";
      ctx.shadowColor = "#00d4ff";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw rover
    const rx = cx + s.x, ry = cy + s.y;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(s.angle + Math.PI / 2);

    // Body
    ctx.fillStyle = "#0a1628";
    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.rect(-12, -18, 24, 30);
    ctx.fill();
    ctx.stroke();

    // Wheels
    ctx.fillStyle = "#00d4ff";
    [-10, 10].forEach(wx => {
      [[-14, -8], [14, -8], [-14, 8], [14, 8]].forEach(([offX, offY]) => {});
      ctx.fillRect(wx - 3, -20, 6, 8);
      ctx.fillRect(wx - 3, 12, 6, 8);
    });

    // Eye/sensor
    ctx.beginPath();
    ctx.arc(0, -8, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff6b00";
    ctx.shadowColor = "#ff6b00";
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Antenna
    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, -26); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -28, 2, 0, Math.PI * 2);
    ctx.fillStyle = "#00d4ff"; ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;

    // Position HUD
    ctx.fillStyle = "rgba(0,212,255,0.8)";
    ctx.font = "10px 'Share Tech Mono'";
    ctx.fillText(`X: ${Math.round(s.x / SCALE)} cm`, 10, 20);
    ctx.fillText(`Y: ${Math.round(-s.y / SCALE)} cm`, 10, 35);
    ctx.fillText(`θ: ${Math.round(((s.angle + Math.PI / 2) * 180 / Math.PI + 360) % 360)}°`, 10, 50);
  }, []);

  const animate = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    if (s.stepIdx >= s.steps.length) {
      s.running = false;
      drawFrame();
      onDone?.();
      return;
    }

    const step = s.steps[s.stepIdx];
    const SPEED = 2; // px per frame

    if (step.cmd === "move" || step.cmd === "moonwalk") {
      const total = Math.abs(step.dist);
      const sign = step.dist >= 0 ? 1 : -1;
      const delta = Math.min(SPEED, total - s.stepProgress);
      s.x += sign * Math.cos(s.angle) * delta;
      s.y += sign * Math.sin(s.angle) * delta;
      s.trail.push({ x: s.x, y: s.y });
      s.stepProgress += delta;
      if (s.stepProgress >= total) { s.stepIdx++; s.stepProgress = 0; }
    } else if (step.cmd === "rotate") {
      const totalRad = (step.angle * Math.PI) / 180;
      const ROT_SPEED = 0.05;
      const delta = totalRad >= 0
        ? Math.min(ROT_SPEED, totalRad - s.stepProgress)
        : Math.max(-ROT_SPEED, totalRad - s.stepProgress);
      s.angle += delta;
      s.stepProgress += delta;
      if (Math.abs(s.stepProgress) >= Math.abs(totalRad)) {
        s.angle = s.angle - s.stepProgress + totalRad; // snap
        s.stepIdx++; s.stepProgress = 0;
      }
    } else if (step.cmd === "circle") {
      const r = step.radius;
      const totalAngle = Math.PI * 2;
      const ARC_SPEED = 0.04;
      const delta = Math.min(ARC_SPEED, totalAngle - s.stepProgress);
      s.stepProgress += delta;
      s.x = r * Math.cos(s.stepProgress - Math.PI / 2 + (s.angle));
      s.y = r * Math.sin(s.stepProgress - Math.PI / 2 + (s.angle));
      s.trail.push({ x: s.x, y: s.y });
      if (s.stepProgress >= totalAngle) { s.stepIdx++; s.stepProgress = 0; }
    } else if (step.cmd === "square") {
      const side = step.side;
      const sides = 4;
      const totalDist = side * sides;
      const MOVE_SPEED = SPEED;
      const currentSide = Math.floor(s.stepProgress / side);
      if (currentSide >= sides) { s.stepIdx++; s.stepProgress = 0; }
      else {
        const sideAngle = s.angle + (currentSide * Math.PI / 2);
        const delta = Math.min(MOVE_SPEED, side - (s.stepProgress % side));
        s.x += Math.cos(sideAngle) * delta;
        s.y += Math.sin(sideAngle) * delta;
        s.trail.push({ x: s.x, y: s.y });
        s.stepProgress += delta;
      }
    }

    drawFrame();
    animRef.current = requestAnimationFrame(animate);
  }, [drawFrame, onDone]);

  // Start/stop simulation
  useEffect(() => {
    if (isRunning && instructions?.length > 0) {
      const steps = buildSteps(instructions);
      stateRef.current = {
        x: 0, y: 0, angle: -Math.PI / 2,
        trail: [{ x: 0, y: 0 }],
        stepIdx: 0, stepProgress: 0,
        steps, running: true
      };
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(animate);
    } else if (!isRunning) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      stateRef.current.running = false;
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isRunning, instructions, animate]);

  // Initial draw
  useEffect(() => {
    stateRef.current = {
      x: 0, y: 0, angle: -Math.PI / 2,
      trail: [{ x: 0, y: 0 }],
      stepIdx: 0, stepProgress: 0,
      steps: [], running: false
    };
    drawFrame();
  }, [drawFrame]);

  const handleReset = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    stateRef.current = {
      x: 0, y: 0, angle: -Math.PI / 2,
      trail: [{ x: 0, y: 0 }],
      stepIdx: 0, stepProgress: 0,
      steps: [], running: false
    };
    drawFrame();
  };

  return (
    <div className="simulator-wrap">
      <div className="sim-toolbar">
        <span className="label" style={{ margin: 0 }}>
          ÁREA DE SIMULACIÓN — UMG BASIC ROVER 2.0
        </span>
        <button className="btn btn-sm" onClick={handleReset}>↺ RESET</button>
      </div>
      <div className="sim-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="sim-canvas"
          width={520}
          height={380}
        />
      </div>
      {instructions?.length === 0 && (
        <div className="sim-empty">
          <div className="sim-empty-icon">🛸</div>
          <p>Compila tu código para ver la simulación del rover</p>
        </div>
      )}
    </div>
  );
}
