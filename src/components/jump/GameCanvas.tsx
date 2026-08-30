import { useEffect, useRef } from "react";

export type MatchEnd = {
  score: number;
  jumps: number;
  durationMs: number;
  won: boolean;
};

export type GameHandlers = {
  /** Chamado a cada pulo válido (lucro potencial, ainda não creditado). */
  onJump: () => void;
  onScore: (score: number) => void;
  /** Progresso da fase, de 0 a 1. */
  onProgress: (progress: number) => void;
  /** Vidas restantes após uma colisão. */
  onLivesChange: (lives: number) => void;
  onEnd: (result: MatchEnd) => void;
};

type ObstacleKind = "spike" | "block" | "platform";
type Obstacle = { x: number; y: number; w: number; h: number; kind: ObstacleKind };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  gravity: number;
  hue: string;
};

const GROUND_RATIO = 0.82;
const START_LIVES = 2;
const LEVEL_LENGTH = 9000; // distância (px) até a linha de chegada
const INVULN_MS = 1500;

/** Gera o mapa da fase de forma procedural (nenhuma partida é igual à outra). */
function buildLevel(): Obstacle[] {
  const list: Obstacle[] = [];
  let x = 900;
  while (x < LEVEL_LENGTH) {
    const difficulty = x / LEVEL_LENGTH; // 0 → 1
    const roll = Math.random();

    if (roll < 0.34) {
      // sequência de espinhos
      const count = 1 + Math.floor(Math.random() * (difficulty > 0.5 ? 3 : 2));
      for (let i = 0; i < count; i++) {
        list.push({ x: x + i * 30, y: 0, w: 28, h: 34 + Math.random() * 20, kind: "spike" });
      }
      x += count * 30;
    } else if (roll < 0.62) {
      // bloco no chão
      const w = 34 + Math.random() * 40;
      list.push({ x, y: 0, w, h: 46 + Math.random() * 46, kind: "block" });
      x += w;
    } else if (roll < 0.82) {
      // plataforma flutuante (alta ou baixa)
      const w = 90 + Math.random() * 90;
      const y = (Math.random() > 0.5 ? 110 : 70) + Math.random() * 30;
      list.push({ x, y, w, h: 18, kind: "platform" });
      x += w;
    } else {
      // bloco + espinho logo depois
      list.push({ x, y: 0, w: 36, h: 50, kind: "block" });
      list.push({ x: x + 150, y: 0, w: 28, h: 36, kind: "spike" });
      x += 186;
    }

    // espaçamento diminui conforme a fase avança → mais densidade
    const gap = (330 - difficulty * 140) + Math.random() * (180 - difficulty * 90);
    x += Math.max(150, gap);
  }
  return list;
}

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

    let alive = true;
    let over = false;
    const start = performance.now();
    let last = start;
    let speed = 340;
    let distance = 0;
    let score = 0;
    let jumps = 0;
    let shake = 0;
    let lives = START_LIVES;
    let invulnUntil = 0;
    let trail: { x: number; y: number; rot: number }[] = [];
    let particles: Particle[] = [];
    const level = buildLevel();

    const player = { x: 0, y: 0, size: 34, vy: 0, onGround: true, rot: 0 };
    const groundY = () => height * GROUND_RATIO;

    /** Explosão radial de partículas neon. */
    const burst = (
      x: number,
      y: number,
      n: number,
      hue: string,
      opts: { power?: number; spread?: number; gravity?: number; up?: boolean } = {},
    ) => {
      const power = opts.power ?? 260;
      const gravity = opts.gravity ?? 900;
      for (let i = 0; i < n; i++) {
        const angle = opts.up
          ? -Math.PI / 2 + (Math.random() - 0.5) * (opts.spread ?? Math.PI * 0.9)
          : Math.random() * Math.PI * 2;
        const v = power * (0.35 + Math.random() * 0.85);
        particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          life: 1,
          decay: 1.1 + Math.random() * 1.2,
          size: 2 + Math.random() * 4,
          gravity,
          hue,
        });
      }
    };

    const jump = () => {
      if (over || pausedRef.current) return;
      if (!player.onGround) return;
      player.vy = -640;
      player.onGround = false;
      jumps += 1;
      burst(player.x, player.y + player.size / 2, 18, "rgba(120,255,190,0.95)", {
        power: 300,
        up: true,
        spread: Math.PI * 1.1,
        gravity: 700,
      });
      burst(player.x, player.y + player.size / 2, 6, "rgba(150,220,255,0.9)", { power: 180 });
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

    const finish = (won: boolean) => {
      if (over) return;
      over = true;
      shake = won ? 10 : 26;
      burst(
        player.x,
        player.y,
        60,
        won ? "rgba(120,255,190,0.95)" : "rgba(255,120,160,0.95)",
        { power: 420 },
      );
      burst(player.x, player.y, 24, "rgba(255,255,255,0.9)", { power: 260 });
      cbRef.current.onEnd({
        score: Math.floor(score),
        jumps,
        durationMs: performance.now() - start,
        won,
      });
    };

    const hit = (now: number) => {
      if (now < invulnUntil) return;
      lives -= 1;
      cbRef.current.onLivesChange(Math.max(0, lives));
      shake = 22;
      burst(player.x, player.y, 46, "rgba(255,120,160,0.95)", { power: 400 });
      burst(player.x, player.y, 16, "rgba(255,220,120,0.95)", { power: 240, gravity: 400 });
      if (lives <= 0) {
        finish(false);
        return;
      }
      invulnUntil = now + INVULN_MS;
    };

    const frame = (now: number) => {
      if (!alive) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const invulnerable = now < invulnUntil;

      if (!pausedRef.current && !over) {
        speed = 340 + Math.min(300, (distance / LEVEL_LENGTH) * 300);
        distance += speed * dt;
        score += speed * dt * 0.1;
        cbRef.current.onScore(Math.floor(score));
        cbRef.current.onProgress(Math.min(1, distance / LEVEL_LENGTH));

        if (distance >= LEVEL_LENGTH) {
          finish(true);
        }

        player.x = Math.max(90, width * 0.22);
        player.vy += 2100 * dt;
        player.y += player.vy * dt;

        const feetPrev = player.y + player.size / 2 - player.vy * dt;
        const gy = groundY() - player.size / 2;

        // pousar sobre plataformas
        let landed = false;
        for (const o of level) {
          if (o.kind !== "platform") continue;
          const sx = o.x - distance;
          if (sx > width || sx + o.w < 0) continue;
          const top = groundY() - o.y;
          const withinX = player.x + player.size / 2 > sx && player.x - player.size / 2 < sx + o.w;
          if (withinX && player.vy >= 0 && feetPrev <= top + 4 && player.y + player.size / 2 >= top) {
            player.y = top - player.size / 2;
            player.vy = 0;
            landed = true;
          }
        }

        if (!landed && player.y >= gy) {
          player.y = gy;
          player.vy = 0;
          landed = true;
        }
        if (landed) {
          if (!player.onGround)
            burst(player.x, player.y + player.size / 2, 12, "rgba(120,220,255,0.85)", {
              power: 200,
              up: true,
              spread: Math.PI * 1.4,
              gravity: 600,
            });
          player.onGround = true;
          player.rot = 0;
        } else {
          player.onGround = false;
          player.rot += dt * 6;
        }

        trail.unshift({ x: player.x, y: player.y, rot: player.rot });
        trail = trail.slice(0, 26);

        // colisões
        const px = player.x - player.size / 2 + 6;
        const py = player.y - player.size / 2 + 6;
        const ps = player.size - 12;
        for (const o of level) {
          const sx = o.x - distance;
          if (sx > width || sx + o.w < 0) continue;
          const top = o.kind === "platform" ? groundY() - o.y : groundY() - o.h;
          const bottom = o.kind === "platform" ? groundY() - o.y + o.h : groundY();
          const overlapX = px < sx + o.w && px + ps > sx;
          const overlapY = py < bottom && py + ps > top;
          if (!overlapX || !overlapY) continue;
          if (o.kind === "platform" && player.vy >= 0 && py + ps <= top + 10) continue;
          hit(now);
          break;
        }
      }

      particles = particles.filter((p) => p.life > 0);
      for (const p of particles) {
        p.life -= dt * p.decay;
        p.vy += p.gravity * dt;
        p.vx *= 1 - dt * 1.2;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      if (shake > 0) shake = Math.max(0, shake - dt * 45);

      /* ── draw ── */
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      }

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#0d1117");
      bg.addColorStop(1, "#121a24");
      ctx.fillStyle = bg;
      ctx.fillRect(-30, -30, width + 60, height + 60);

      ctx.fillStyle = "rgba(90,255,190,0.05)";
      for (let i = 0; i < 12; i++) {
        const x = ((i * 180 - distance * 0.2) % (width + 360)) - 180;
        const bh = 60 + ((i * 47) % 140);
        ctx.fillRect(x, groundY() - bh, 90, bh);
      }

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

      // linha de chegada
      const finishX = LEVEL_LENGTH - distance;
      if (finishX < width + 60) {
        ctx.save();
        ctx.fillStyle = "rgba(190,140,255,0.85)";
        ctx.shadowColor = "rgba(190,140,255,0.9)";
        ctx.shadowBlur = 22;
        ctx.fillRect(finishX, groundY() - 220, 8, 220);
        ctx.restore();
      }

      // obstáculos
      for (const o of level) {
        const sx = o.x - distance;
        if (sx > width + 60 || sx + o.w < -60) continue;
        ctx.save();
        if (o.kind === "platform") {
          ctx.shadowColor = "rgba(120,220,255,0.8)";
          ctx.shadowBlur = 16;
          ctx.fillStyle = "rgba(130,215,255,0.9)";
          ctx.beginPath();
          ctx.roundRect(sx, groundY() - o.y, o.w, o.h, 6);
          ctx.fill();
        } else {
          ctx.shadowColor = "rgba(255,90,150,0.8)";
          ctx.shadowBlur = 18;
          ctx.fillStyle = "rgba(255,110,165,0.9)";
          if (o.kind === "spike") {
            ctx.beginPath();
            ctx.moveTo(sx, groundY());
            ctx.lineTo(sx + o.w / 2, groundY() - o.h);
            ctx.lineTo(sx + o.w, groundY());
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.roundRect(sx, groundY() - o.h, o.w, o.h, 6);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // rastro neon
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      trail.forEach((t, i) => {
        const k = 1 - i / trail.length;
        const a = k * k * 0.4;
        const s = player.size * (0.35 + k * 0.65);
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rot);
        ctx.shadowColor = "rgba(120,255,190,0.8)";
        ctx.shadowBlur = 18 * k;
        ctx.fillStyle = `rgba(${Math.round(120 + 80 * (1 - k))},255,${Math.round(190 + 40 * (1 - k))},${a})`;
        ctx.beginPath();
        ctx.roundRect(-s / 2, -s / 2, s, s, 9 * k + 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();

      // player (pisca quando invulnerável)
      const blink = invulnerable && Math.floor(now / 90) % 2 === 0;
      if (!blink) {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.rot);
        ctx.shadowColor = invulnerable ? "rgba(255,220,120,0.9)" : "rgba(120,255,190,0.9)";
        ctx.shadowBlur = 24;
        ctx.fillStyle = invulnerable ? "#ffe08a" : "#7dffc0";
        ctx.beginPath();
        ctx.roundRect(-player.size / 2, -player.size / 2, player.size, player.size, 9);
        ctx.fill();
        ctx.fillStyle = "#0d1117";
        ctx.fillRect(-8, -6, 5, 8);
        ctx.fillRect(3, -6, 5, 8);
        ctx.restore();
      }

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

export { START_LIVES };
