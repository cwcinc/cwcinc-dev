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
};

const SPACING = 20;
const INFLUENCE = 30;
const INFLUENCE_HELD = 100;
const PUSH_STRENGTH = 60;
const EASE_IN = 0.1;
const EASE_OUT = 0.01;

export default function PointCloud({ isDark = true }: { isDark?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const held = useRef(false);
  const rects = useRef<Rect[]>([]);
  const raf = useRef<number>(0);
  const isDarkRef = useRef(isDark);
  const buildRectsRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let cellW = SPACING;
    let cellH = SPACING;

    function cellShade(c: number, r: number) {
      let h = (c * 374761393 + r * 1103515245) | 0;
      h = Math.imul(h ^ (h >>> 13), 1664525);
      h = h ^ (h >>> 16);
      return isDarkRef.current
        ? 20 + (Math.abs(h) % 7)
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

      const arr: Rect[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const shade = cellShade(c, r);
          const isAccent = c == 0 || r == 0 || c == cols - 1 || r == rows - 1;
          const cx = c * cellW + cellW / 2;
          const cy = r * cellH + cellH / 2;
          const isLight = inTriangle(cx, cy, tcx, tcy, R) && !inTriangle(cx, cy, tcx, tcy, R - cellW * 5);
          arr.push({ baseX: c * cellW, baseY: r * cellH, x: c * cellW, y: r * cellH, lockedAxis: null, shade, isAccent, isLight });
        }
      }
      rects.current = arr;
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
      } else if (type === "pointcloud-mousedown") {
        held.current = true;
      } else if (type === "pointcloud-mouseup") {
        held.current = false;
      }
    }
    window.addEventListener("message", onMessage);

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const influence = held.current ? INFLUENCE_HELD : INFLUENCE;

      for (const p of rects.current) {
        // Use rect center for distance calculation
        const cx = p.baseX + cellW / 2;
        const cy = p.baseY + cellH / 2;
        const dx = cx - mx;
        const dy = cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let tx = p.baseX;
        let ty = p.baseY;

        if (dist < influence && dist > 0) {
          const force = (1 - dist / influence) * PUSH_STRENGTH;
          if (Math.abs(dx) >= Math.abs(dy)) {
            tx = p.baseX + (dx >= 0 ? 1 : -1) * force;
          } else {
            ty = p.baseY + (dy >= 0 ? 1 : -1) * force;
          }
        }

        const moving = tx !== p.baseX || ty !== p.baseY;
        const ease = moving ? EASE_IN : EASE_OUT;
        p.x += (tx - p.x) * ease;
        p.y += (ty - p.y) * ease;

        ctx.fillStyle = `rgb(${p.shade},${p.shade},${p.shade})`;
        if (p.isLight) {
          const s = isDarkRef.current ? p.shade + 25 : p.shade - 20;
          ctx.fillStyle = `rgb(${s},${s},${s})`;
        }
        if (p.isAccent) {
          const s = p.shade;
          ctx.fillStyle = isDarkRef.current
            ? `rgb(${s + 10},${s - 10},${s - 10})`
            : `rgb(${s - 10},${s - 10},${s + 10})`;
        }
        ctx.fillRect(p.x, p.y, cellW, cellH);
      }

      raf.current = requestAnimationFrame(draw);
    }

    draw();

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
