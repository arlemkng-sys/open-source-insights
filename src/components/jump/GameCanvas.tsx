import { useEffect, useRef } from "react";

export type GameHandlers = {
  onJump: () => void;
  onScore: (score: number) => void;
  onGameOver: (result: { score: number; jumps: number; durationMs: number }) => void;
};

type Obstacle = { x: number; w: number; h: number; kind: "spike" | "block" };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; hue: string };

const GROUND_RATIO = 0.82;

export function GameCanvas({
  paused,
  runId,
  handlers,
}: {
  paused: boolean;
  runId: number;
  handlers: GameHandlers;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(paused);
  const cbRef = useRef(handlers);
  pausedRef.current = paused;
  cbRef.current = handlers;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // state
    let alive = true;
    let over = false;
    const start = performance.now();
    let last = start;
    let speed = 340;
    let distance = 0;
    let score = 0;
    let jumps = 0;
    let shake = 0;
    let trail: { x: number; y: number; a: number }[] = [];
    let particles: Particle[] = [];
    let obstacles: Obstacle[] = [];
    let nextSpawn = 600;

    const player = { x: 0, y: 0, size: 34, vy: 0, onGround: true, rot: 0 };

    const groundY = () => height * GROUND_RATIO;

    const spawnParticles = (x: number, y: number, n: number, hue: string) => {
      for (let i = 0; i < n; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 220,
          vy: -Math.random() * 220,
          life: 1,
          hue,
        });
      }
    };

    const jump = () => {
      if (over || pausedRef.current) return;
      if (!player.onGround) return;
      player.vy = -620;
      player.onGround = false;
      jumps += 1;
      spawnParticles(player.x, groundY(), 8, "rgba(120,255,190,0.9)");
      cbRef.current.onJump();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        jump();
      }
    };
    const onPointer = (e: Event) => {
      e.preventDefault();
      jump();
    };
    window.addEventListener("keydown", onKey);
    canvas.addEventListener("pointerdown", onPointer);

    const endGame = () => {
      if (over) return;
      over = true;
      shake = 18;
      spawnParticles(player.x, player.y, 26, "rgba(255,120,160,0.95)");
      cbRef.current.onGameOver({
        score: Math.floor(score),
        jumps,
        durationMs: performance.now() - start,
      });
    };

    const frame = (now: number) => {
      if (!alive) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (!pausedRef.current && !over) {
        speed = 340 + Math.min(360, distance / 22);
        distance += speed * dt;
        score += speed * dt * 0.1;
        cbRef.current.onScore(Math.floor(score));

        // physics
        player.x = Math.max(90, width * 0.22);
        player.vy += 2100 * dt;
        player.y += player.vy * dt;
        const gy = groundY() - player.size / 2;
        if (player.y >= gy) {
          player.y = gy;
          player.vy = 0;
          if (!player.onGround) spawnParticles(player.x, groundY(), 6, "rgba(120,220,255,0.8)");
          player.onGround = true;
          player.rot = 0;
        } else {
          player.rot += dt * 6;
        }

        trail.unshift({ x: player.x, y: player.y, a: 1 });
        trail = trail.slice(0, 16);

        // obstacles
        nextSpawn -= speed * dt;
        if (nextSpawn <= 0) {
          const kind: Obstacle["kind"] = Math.random() > 0.55 ? "block" : "spike";
          const h = kind === "spike" ? 34 + Math.random() * 22 : 42 + Math.random() * 40;
          obstacles.push({ x: width + 40, w: kind === "spike" ? 30 : 34, h, kind });
          const gap = Math.max(260, 620 - distance / 40) + Math.random() * 180;
          nextSpawn = gap;
        }
        obstacles = obstacles.filter((o) => o.x + o.w > -60);
        for (const o of obstacles) {
          o.x -= speed * dt;
          const px = player.x - player.size / 2 + 6;
          const py = player.y - player.size / 2 + 6;
          const ps = player.size - 12;
          if (
            px < o.x + o.w &&
            px + ps > o.x &&
            py + ps > groundY() - o.h &&
            py < groundY()
          ) {
            endGame();
          }
        }
      }

      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.life -= dt * 1.6;
        p.vy += 900 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      if (shake > 0) shake = Math.max(0, shake - dt * 40);

      /* ── draw ── */
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }

      // background
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#0d1117");
      bg.addColorStop(1, "#121a24");
      ctx.fillStyle = bg;
      ctx.fillRect(-30, -30, width + 60, height + 60);

      // parallax silhouettes
      ctx.fillStyle = "rgba(90,255,190,0.05)";
      for (let i = 0; i < 12; i++) {
        const bw = 90;
        const x = ((i * 180 - distance * 0.2) % (width + 360)) - 180;
        const bh = 60 + ((i * 47) % 140);
        ctx.fillRect(x, groundY() - bh, bw, bh);
      }

      // floor grid
      ctx.strokeStyle = "rgba(120,220,255,0.18)";
      ctx.lineWidth = 1;
      const offset = distance % 60;
      for (let x = -offset; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, groundY());
        ctx.lineTo(x - 60, height);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, groundY());
      ctx.lineTo(width, groundY());
      ctx.strokeStyle = "rgba(120,255,190,0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // obstacles
      for (const o of obstacles) {
        ctx.save();
        ctx.shadowColor = "rgba(255,90,150,0.8)";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "rgba(255,110,165,0.9)";
        if (o.kind === "spike") {
          ctx.beginPath();
          ctx.moveTo(o.x, groundY());
          ctx.lineTo(o.x + o.w / 2, groundY() - o.h);
          ctx.lineTo(o.x + o.w, groundY());
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(o.x, groundY() - o.h, o.w, o.h, 6);
          ctx.fill();
        }
        ctx.restore();
      }

      // trail
      trail.forEach((t, i) => {
        const a = (1 - i / trail.length) * 0.28;
        ctx.fillStyle = `rgba(120,255,190,${a})`;
        const s = player.size * (1 - i / (trail.length * 1.6));
        ctx.fillRect(t.x - s / 2, t.y - s / 2, s, s);
      });

      // player
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.rot);
      ctx.shadowColor = "rgba(120,255,190,0.9)";
      ctx.shadowBlur = 24;
      ctx.fillStyle = "#7dffc0";
      ctx.beginPath();
      ctx.roundRect(-player.size / 2, -player.size / 2, player.size, player.size, 9);
      ctx.fill();
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(-8, -6, 5, 8);
      ctx.fillRect(3, -6, 5, 8);
      ctx.restore();

      // particles
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.hue;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      requestAnimationFrame(frame);
    };

    player.y = groundY() - player.size / 2;
    const raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointer);
    };
  }, [runId]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block h-full w-full touch-none"
      aria-label="Área de jogo JumpCoins"
    />
  );
}
