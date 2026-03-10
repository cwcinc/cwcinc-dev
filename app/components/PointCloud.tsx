"use client";

import { useEffect, useRef } from "react";

type Rect = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  lockedAxis: "h" | "v" | null;
  shade: number;
  isAccent: boolean;
  isLight: boolean;
  intro: boolean;
  introDelay: number;
};

const SPACING = 20;
const INFLUENCE = 30;
const INFLUENCE_HELD = 50;
const PUSH_STRENGTH = 60;
const PUSH_STRENGTH_HELD = 150;
const EASE_IN = 0.1;
const EASE_OUT = 0.02;

const EASE_INTRO = 0.01;
const INTRO_OFFSET = 200;
const FADE_DISTANCE = 200;
const MAX_INTRO_DELAY = 1000;
const INTRO_SCALE_MIN = 0.1;

export default function PointCloud({ isDark = true, skipIntro = false }: { isDark?: boolean; skipIntro?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const prevMouse = useRef({ x: -9999, y: -9999 });
  const held = useRef(false);
  const rects = useRef<Rect[]>([]);
  const raf = useRef<number>(0);
  const isDarkRef = useRef(isDark);
  const buildRectsRef = useRef<() => void>(() => {});
  const themeInitRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let cellW = SPACING;
    let cellH = SPACING;
    let introPlayed = false;
    let introStartTime = -1;

    function cellShade(c: number, r: number) {
      let h = (c * 374761393 + r * 1103515245) | 0;
      h = Math.imul(h ^ (h >>> 13), 1664525);
      h = h ^ (h >>> 16);
      return isDarkRef.current
        ? 12 + (Math.abs(h) % 4)
        : 215 + (Math.abs(h) % 15);
    }

    function inTriangle(
      px: number, py: number, tcx: number, tcy: number, R: number,
    ) {
      const ax = tcx;
      const ay = tcy + R;

      const bx = tcx + R * Math.sqrt(3) / 2;
      const by = tcy - R / 2;

      const cx2 = tcx - R * Math.sqrt(3) / 2;
      const cy2 = tcy - R / 2;

      const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
      const d2 = (px - cx2) * (by - cy2) - (bx - cx2) * (py - cy2);
      const d3 = (px - ax) * (cy2 - ay) - (cx2 - ax) * (py - ay);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      return !(hasNeg && hasPos);
    }

    function buildRects() {
      const cols = Math.round(canvas.width / SPACING);
      const rows = Math.round(canvas.height / SPACING);
      cellW = canvas.width / cols;
      cellH = canvas.height / rows;

      // Equilateral triangle centered in canvas, circumradius = 60% of min dimension
      const tcx = canvas.width / 2;
      const tcy = canvas.height / 2.8;
      const R = Math.min(canvas.width, canvas.height) * 0.6;

      // If grid dimensions unchanged (theme toggle), only refresh shade/isLight
      // to avoid disrupting in-flight intro or mouse-pushed positions
      if (introPlayed && rects.current.length === cols * rows) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const p = rects.current[r * cols + c];
            p.shade = cellShade(c, r);
            const cx = c * cellW + cellW / 2;
            const cy = r * cellH + cellH / 2;
            p.isLight = inTriangle(cx, cy, tcx, tcy, R) && !inTriangle(cx, cy, tcx, tcy, R - cellW * 5);
            p.baseX = c * cellW;
            p.baseY = r * cellH;
          }
        }
        return;
      }

      const arr: Rect[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const shade = cellShade(c, r);
          const isAccent = c == 0 || r == 0 || c == cols - 1 || r == rows - 1;
          const cx = c * cellW + cellW / 2;
          const cy = r * cellH + cellH / 2;
          const isLight = inTriangle(cx, cy, tcx, tcy, R) && !inTriangle(cx, cy, tcx, tcy, R - cellW * 5);

          let startX = c * cellW;
          let startY = r * cellH;

          if (!introPlayed && !skipIntro) {
            // Proper avalanche hash for axis selection (independent of cellShade)
            let h = (c * 1664525 + r * 22695477 + 12345) | 0;
            h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
            h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
            h = h ^ (h >>> 16);
            const introAxis = (h & 1) === 0 ? "h" : "v";
            const introOffset = INTRO_OFFSET + Math.random() * 200;
            if (introAxis === "h") {
              startX = c * cellW + (cx < canvas.width / 2 ? -introOffset : introOffset);
            } else {
              startY = r * cellH + (cy < canvas.height / 2 ? -introOffset : introOffset);
            }
          }

          arr.push({ baseX: c * cellW, baseY: r * cellH, x: startX, y: startY, lockedAxis: null, shade, isAccent, isLight, intro: !introPlayed && !skipIntro, introDelay: (introPlayed || skipIntro) ? 0 : Math.random() * MAX_INTRO_DELAY });
        }
      }
      rects.current = arr;
      introPlayed = true;
    }
    buildRectsRef.current = buildRects;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildRects();
    }

    resize();
    window.addEventListener("resize", resize);

    function onMouseMove(e: MouseEvent) {
      mouse.current = { x: e.clientX, y: e.clientY };
    }
    function onMouseLeave() {
      mouse.current = { x: -9999, y: -9999 };
      prevMouse.current = { x: -9999, y: -9999 };
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    function onMouseDown() { held.current = true; }
    function onMouseUp() { held.current = false; }
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    function onMessage(e: MessageEvent) {
      const { type, nx, ny } = e.data ?? {};
      if (type === "pointcloud-mouse") {
        mouse.current = { x: nx * canvas.width, y: ny * canvas.height };
      } else if (type === "pointcloud-mouse-leave") {
        mouse.current = { x: -9999, y: -9999 };
        prevMouse.current = { x: -9999, y: -9999 };
      } else if (type === "pointcloud-mousedown") {
        held.current = true;
      } else if (type === "pointcloud-mouseup") {
        held.current = false;
      }
    }
    window.addEventListener("message", onMessage);

    function draw(time: DOMHighResTimeStamp) {
      if (introStartTime < 0) introStartTime = time;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const influence = held.current ? INFLUENCE_HELD : INFLUENCE;
      const push_strength = held.current ? PUSH_STRENGTH_HELD : PUSH_STRENGTH;

      // Segment from previous to current mouse position for continuous sweep
      const pmx = prevMouse.current.x > -1000 ? prevMouse.current.x : mx;
      const pmy = prevMouse.current.y > -1000 ? prevMouse.current.y : my;
      const segDx = mx - pmx;
      const segDy = my - pmy;
      const segLenSq = segDx * segDx + segDy * segDy;

      for (const p of rects.current) {
        // Closest point on the mouse path segment to this tile's center
        const cx = p.baseX + cellW / 2;
        const cy = p.baseY + cellH / 2;
        let closestX: number, closestY: number;
        if (segLenSq < 1) {
          closestX = mx;
          closestY = my;
        } else {
          const t = Math.max(0, Math.min(1, ((cx - pmx) * segDx + (cy - pmy) * segDy) / segLenSq));
          closestX = pmx + t * segDx;
          closestY = pmy + t * segDy;
        }
        const dx = cx - closestX;
        const dy = cy - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let tx = p.baseX;
        let ty = p.baseY;

        if (dist < influence && dist > 0) {
          const force = (1 - dist / influence) * push_strength;
          if (Math.abs(dx) >= Math.abs(dy)) {
            tx = p.baseX + (dx >= 0 ? 1 : -1) * force;
          } else {
            ty = p.baseY + (dy >= 0 ? 1 : -1) * force;
          }
        }

        const beingPushed = tx !== p.baseX || ty !== p.baseY;
        if (!p.intro || time - introStartTime >= p.introDelay) {
          const ease = beingPushed ? EASE_IN : (p.intro ? EASE_INTRO : EASE_OUT);
          p.x += (tx - p.x) * ease;
          p.y += (ty - p.y) * ease;

          if (p.intro && Math.abs(p.x - p.baseX) < 0.5 && Math.abs(p.y - p.baseY) < 0.5) {
            p.intro = false;
            p.x = p.baseX;
            p.y = p.baseY;
          }
        }

        const dispX = p.x - p.baseX;
        const dispY = p.y - p.baseY;
        const disp = Math.sqrt(dispX * dispX + dispY * dispY);
        const introProg = p.intro ? Math.max(0, 1 - disp / FADE_DISTANCE) : 1;
        ctx.globalAlpha = 1;

        ctx.fillStyle = `rgb(${p.shade},${p.shade},${p.shade})`;
        if (p.isLight) {
          const s = isDarkRef.current ? p.shade + 25 : p.shade - 30;
          ctx.fillStyle = `rgb(${s},${s},${s})`;
        }
        if (p.isAccent) {
          const s = p.shade;
          ctx.fillStyle = isDarkRef.current
            ? `rgb(${s + 10},${s - 10},${s - 10})`
            : `rgb(${s - 10},${s - 10},${s + 10})`;
        }

        const scale = INTRO_SCALE_MIN + (1 - INTRO_SCALE_MIN) * introProg;
        const sw = cellW * scale;
        const sh = cellH * scale;
        ctx.fillRect(p.x + (cellW - sw) / 2, p.y + (cellH - sh) / 2, sw, sh);
        ctx.globalAlpha = 1;
      }

      prevMouse.current = { x: mx, y: my };
      raf.current = requestAnimationFrame(draw);
    }

    raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  useEffect(() => {
    isDarkRef.current = isDark;
    if (!themeInitRef.current) {
      themeInitRef.current = true;
      return;
    }
    buildRectsRef.current();
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
