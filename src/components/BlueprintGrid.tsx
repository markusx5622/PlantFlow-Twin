'use client';

import { useEffect, useRef } from 'react';

/**
 * BlueprintGrid — Animated engineering-grade background canvas.
 *
 * Renders a subtle, slowly-moving grid with flow traces, node pulses,
 * and faint blueprint lines that reinforce the "digital twin / industrial
 * simulation" identity of PlantFlow Twin.
 *
 * All animation respects prefers-reduced-motion.
 */
export function BlueprintGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let time = 0;

    const GRID_SIZE = 48;
    const NODE_COUNT = 18;
    const FLOW_COUNT = 6;

    interface FlowNode {
      x: number;
      y: number;
      radius: number;
      phase: number;
      speed: number;
    }

    interface FlowTrace {
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      progress: number;
      speed: number;
      length: number;
    }

    const nodes: FlowNode[] = [];
    const flows: FlowTrace[] = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initNodes() {
      nodes.length = 0;
      flows.length = 0;

      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;

      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius: 1.5 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 0.7,
        });
      }

      for (let i = 0; i < FLOW_COUNT; i++) {
        const a = nodes[Math.floor(Math.random() * nodes.length)];
        const b = nodes[Math.floor(Math.random() * nodes.length)];
        if (a === b) continue;
        flows.push({
          fromX: a.x,
          fromY: a.y,
          toX: b.x,
          toY: b.y,
          progress: Math.random(),
          speed: 0.0003 + Math.random() * 0.0005,
          length: 0.08 + Math.random() * 0.12,
        });
      }
    }

    function drawGrid(w: number, h: number) {
      ctx!.strokeStyle = 'rgba(78, 140, 255, 0.03)';
      ctx!.lineWidth = 0.5;

      for (let x = 0; x <= w; x += GRID_SIZE) {
        ctx!.beginPath();
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
        ctx!.stroke();
      }
      for (let y = 0; y <= h; y += GRID_SIZE) {
        ctx!.beginPath();
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
        ctx!.stroke();
      }

      // Intersection dots
      ctx!.fillStyle = 'rgba(78, 140, 255, 0.05)';
      for (let x = 0; x <= w; x += GRID_SIZE) {
        for (let y = 0; y <= h; y += GRID_SIZE) {
          ctx!.beginPath();
          ctx!.arc(x, y, 1, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    function drawNodes(t: number) {
      for (const node of nodes) {
        const pulse = 0.5 + 0.5 * Math.sin(t * node.speed + node.phase);
        const alpha = 0.06 + 0.1 * pulse;
        const r = node.radius + pulse * 1.5;

        // Outer glow
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r * 3, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(78, 140, 255, ${alpha * 0.3})`;
        ctx!.fill();

        // Core
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(78, 140, 255, ${alpha})`;
        ctx!.fill();
      }
    }

    function drawFlows() {
      for (const flow of flows) {
        flow.progress += flow.speed;
        if (flow.progress > 1 + flow.length) flow.progress = -flow.length;

        const startP = Math.max(0, flow.progress - flow.length);
        const endP = Math.min(1, flow.progress);
        if (endP <= startP) continue;

        const sx = flow.fromX + (flow.toX - flow.fromX) * startP;
        const sy = flow.fromY + (flow.toY - flow.fromY) * startP;
        const ex = flow.fromX + (flow.toX - flow.fromX) * endP;
        const ey = flow.fromY + (flow.toY - flow.fromY) * endP;

        const grad = ctx!.createLinearGradient(sx, sy, ex, ey);
        grad.addColorStop(0, 'rgba(78, 140, 255, 0)');
        grad.addColorStop(0.5, 'rgba(78, 140, 255, 0.12)');
        grad.addColorStop(1, 'rgba(78, 140, 255, 0)');

        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(sx, sy);
        ctx!.lineTo(ex, ey);
        ctx!.stroke();
      }
    }

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;

      ctx!.clearRect(0, 0, w, h);
      drawGrid(w, h);

      if (!prefersReducedMotion) {
        time += 0.016;
        drawNodes(time);
        drawFlows();
      }

      animationId = requestAnimationFrame(draw);
    }

    resize();
    initNodes();

    if (prefersReducedMotion) {
      // Draw a single static frame
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, w, h);
      drawGrid(w, h);
      drawNodes(0);
    } else {
      draw();
    }

    const handleResize = () => {
      resize();
      initNodes();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="blueprint-grid"
      aria-hidden="true"
    />
  );
}
