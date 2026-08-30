import { useCallback, useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/jump-audio";

export type RunResult = {
  score: number;
  coins: number;
  jumps: number;
  progress: number; // 0..100
  completed: boolean;
};

type Props = {
  onJump: () => void;
  onCoin: () => void;
  onFinish: (result: RunResult) => void;
};

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Obstacle = { x: number; y: number; w: number; h: number; kind: "spike" | "block" };
type Platform = { x: number; y: number; w: number };
type Coin = { x: number; y: number; taken: boolean };

const W = 960;
const H = 380;
const GROUND = H - 64;
const GOAL = 3000; // distance for 100%
const GRAVITY = 0.62;
const JUMP_V = -12.4;

export function GameCanvas({ onJump, onCoin, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"idle" | "playing" | "over" | "won">("idle");
  const [hud, setHud] = useState({ score: 0, coins: 0, lives: 2, progress: 0 });

  const state = useRef({
    running: false,
    x: 120,
    y: GROUND,
    vy: 0,
    onGround: true,
    jumpsLeft: 2,
    lives: 2,
    coins: 0,
    jumps: 0,
    distance: 0,
    speed: 5.2,
    shake: 0,
    invuln: 0,
    t: 0,
    trail: [] as { x: number; y: number; a: number }[],
    particles: [] as Particle[],
    obstacles: [] as Obstacle[],
    platforms: [] as Platform[],
    coinsList: [] as Coin[],
    nextObstacle: 400,
    nextCoin: 260,
  });

  const burst = useCallback((x: number, y: number, color: string, n = 14) => {
    const s = state.current;
    for (let i = 0; i < n; i++) {
      s.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.8) * 5,
        life: 1,
        color,
      });
    }
  }, []);

  const reset = useCallback(() => {
    const s = state.current;
    Object.assign(s, {
      running: true,
      x: 120,
      y: GROUND,
      vy: 0,
      onGround: true,
      jumpsLeft: 2,
      lives: 2,
      coins: 0,
      jumps: 0,
      distance: 0,
      speed: 5.2,
      shake: 0,
      invuln: 0,
      t: 0,
      trail: [],
      particles: [],
      obstacles: [],
      platforms: [],
      coinsList: [],
      nextObstacle: 400,
      nextCoin: 260,
    });
    setHud({ score: 0, coins: 0, lives: 2, progress: 0 });
  }, []);

  const doJump = useCallback(() => {
    const s = state.current;
    if (!s.running) return;
    if (s.jumpsLeft <= 0) return;
    s.jumpsLeft -= 1;
    s.vy = JUMP_V;
    s.onGround = false;
    s.jumps += 1;
    burst(s.x, s.y, "#39ff88", 10);
    sfx.jump();
    onJump();
  }, [burst, onJump]);

  const start = useCallback(() => {
    sfx.click();
    reset();
    setStatus("playing");
  }, [reset]);

  const finish = useCallback(
    (won: boolean) => {
      const s = state.current;
      s.running = false;
      const progress = Math.min(100, Math.round((s.distance / GOAL) * 100));
      setStatus(won ? "won" : "over");
      if (won) sfx.achievement();
      else sfx.gameOver();
      onFinish({
        score: Math.floor(s.distance / 10) + s.coins * 10,
        coins: s.coins,
        jumps: s.jumps,
        progress: won ? 100 : progress,
        completed: won,
      });
    },
    [onFinish],
  );

  // Input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (state.current.running) doJump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doJump]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;

    const draw = () => {
      const s = state.current;
      s.t += 1;

      if (s.running) {
        s.speed = 5.2 + (s.distance / GOAL) * 5.5;
        s.distance += s.speed;
        if (s.invuln > 0) s.invuln -= 1;

        // physics
        s.vy += GRAVITY;
        s.y += s.vy;

        let landed = false;
        if (s.y >= GROUND) {
          s.y = GROUND;
          s.vy = 0;
          landed = true;
        }
        for (const p of s.platforms) {
          if (
            s.vy >= 0 &&
            s.x + 14 > p.x &&
            s.x - 14 < p.x + p.w &&
            s.y >= p.y - 4 &&
            s.y <= p.y + 18
          ) {
            s.y = p.y;
            s.vy = 0;
            landed = true;
          }
        }
        s.onGround = landed;
        if (landed) s.jumpsLeft = 2;

        // trail
        s.trail.unshift({ x: s.x, y: s.y, a: 1 });
        if (s.trail.length > 18) s.trail.pop();

        // spawn
        s.nextObstacle -= s.speed;
        s.nextCoin -= s.speed;
        const difficulty = s.distance / GOAL;
        if (s.nextObstacle <= 0) {
          const kind: Obstacle["kind"] = Math.random() > 0.55 ? "block" : "spike";
          const h = kind === "spike" ? 34 : 44 + Math.random() * 26;
          s.obstacles.push({ x: W + 40, y: GROUND - h, w: kind === "spike" ? 26 : 34, h, kind });
          s.nextObstacle = 400 - difficulty * 170 + Math.random() * 200;
          if (Math.random() < 0.35 + difficulty * 0.2) {
            s.platforms.push({ x: W + 140, y: GROUND - 110 - Math.random() * 50, w: 120 });
          }
        }
        if (s.nextCoin <= 0) {
          const base = Math.random() > 0.5 ? GROUND - 50 : GROUND - 130;
          for (let i = 0; i < 3; i++) s.coinsList.push({ x: W + 40 + i * 42, y: base, taken: false });
          s.nextCoin = 300 + Math.random() * 320;
        }

        // move world
        for (const o of s.obstacles) o.x -= s.speed;
        for (const p of s.platforms) p.x -= s.speed;
        for (const c of s.coinsList) c.x -= s.speed;
        s.obstacles = s.obstacles.filter((o) => o.x > -80);
        s.platforms = s.platforms.filter((p) => p.x + p.w > -80);
        s.coinsList = s.coinsList.filter((c) => c.x > -60 && !c.taken);

        // coin pickup
        for (const c of s.coinsList) {
          if (!c.taken && Math.hypot(c.x - s.x, c.y - (s.y - 18)) < 30) {
            c.taken = true;
            s.coins += 1;
            burst(c.x, c.y, "#ffd93d", 12);
            sfx.coin();
            onCoin();
          }
        }

        // collisions
        if (s.invuln <= 0) {
          for (const o of s.obstacles) {
            if (
              s.x + 14 > o.x &&
              s.x - 14 < o.x + o.w &&
              s.y > o.y &&
              s.y - 36 < o.y + o.h
            ) {
              s.lives -= 1;
              s.invuln = 90;
              s.shake = 16;
              burst(s.x, s.y - 18, "#ff4d8d", 26);
              sfx.hit();
              if (s.lives <= 0) {
                finish(false);
              }
              break;
            }
          }
        }

        if (s.distance >= GOAL) {
          s.shake = 12;
          burst(s.x, s.y - 20, "#39ff88", 40);
          finish(true);
        }

        setHud({
          score: Math.floor(s.distance / 10) + s.coins * 10,
          coins: s.coins,
          lives: Math.max(0, s.lives),
          progress: Math.min(100, (s.distance / GOAL) * 100),
        });
      }

      // particles
      for (const p of s.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.025;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      // ── render ──
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const shakeX = s.shake ? (Math.random() - 0.5) * s.shake : 0;
      const shakeY = s.shake ? (Math.random() - 0.5) * s.shake : 0;
      if (s.shake > 0) s.shake *= 0.86;
      ctx.translate(shakeX, shakeY);

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0d0a1c");
      bg.addColorStop(1, "#150f2b");
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // parallax grid
      ctx.strokeStyle = "rgba(120,80,255,0.18)";
      ctx.lineWidth = 1;
      const off = (s.distance * 0.5) % 60;
      for (let x = -off; x < W + 60; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND);
        ctx.lineTo(x - 120, H);
        ctx.stroke();
      }
      for (let y = GROUND; y < H; y += 14) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // skyline
      ctx.fillStyle = "rgba(60,220,255,0.10)";
      const off2 = (s.distance * 0.18) % 140;
      for (let i = -1; i < 9; i++) {
        const bx = i * 140 - off2;
        const bh = 60 + ((i * 47) % 90);
        ctx.fillRect(bx, GROUND - bh, 90, bh);
      }

      // ground line
      ctx.strokeStyle = "#39ff88";
      ctx.shadowColor = "#39ff88";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, GROUND + 2);
      ctx.lineTo(W, GROUND + 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // platforms
      for (const p of s.platforms) {
        ctx.fillStyle = "rgba(60,220,255,0.22)";
        ctx.strokeStyle = "#3cdcff";
        ctx.shadowColor = "#3cdcff";
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2;
        ctx.fillRect(p.x, p.y, p.w, 10);
        ctx.strokeRect(p.x, p.y, p.w, 10);
        ctx.shadowBlur = 0;
      }

      // obstacles
      for (const o of s.obstacles) {
        ctx.strokeStyle = o.kind === "spike" ? "#ff4d8d" : "#b06cff";
        ctx.fillStyle = o.kind === "spike" ? "rgba(255,77,141,0.2)" : "rgba(176,108,255,0.2)";
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2;
        if (o.kind === "spike") {
          ctx.beginPath();
          ctx.moveTo(o.x, o.y + o.h);
          ctx.lineTo(o.x + o.w / 2, o.y);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.strokeRect(o.x, o.y, o.w, o.h);
        }
        ctx.shadowBlur = 0;
      }

      // coins
      for (const c of s.coinsList) {
        const pulse = 1 + Math.sin((s.t + c.x) * 0.12) * 0.12;
        ctx.beginPath();
        ctx.fillStyle = "#ffd93d";
        ctx.shadowColor = "#ffd93d";
        ctx.shadowBlur = 16;
        ctx.arc(c.x, c.y, 9 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // trail
      s.trail.forEach((t, i) => {
        const a = (1 - i / s.trail.length) * 0.35;
        ctx.fillStyle = `rgba(57,255,136,${a})`;
        ctx.fillRect(t.x - 12, t.y - 34, 24, 34);
      });

      // player
      const blink = s.invuln > 0 && Math.floor(s.t / 5) % 2 === 0;
      if (!blink) {
        ctx.fillStyle = "rgba(57,255,136,0.25)";
        ctx.strokeStyle = "#39ff88";
        ctx.shadowColor = "#39ff88";
        ctx.shadowBlur = 22;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(s.x - 14, s.y - 36, 28, 36, 8);
        ctx.fill();
        ctx.stroke();
        // eyes
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#0d0a1c";
        ctx.fillRect(s.x + 1, s.y - 26, 5, 6);
        ctx.fillRect(s.x - 8, s.y - 26, 5, 6);
        // legs
        const legPhase = s.onGround ? Math.sin(s.t * 0.4) * 6 : 6;
        ctx.strokeStyle = "#39ff88";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(s.x - 6, s.y);
        ctx.lineTo(s.x - 6 - legPhase, s.y + 8);
        ctx.moveTo(s.x + 6, s.y);
        ctx.lineTo(s.x + 6 + legPhase, s.y + 8);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // particles
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [burst, finish, onCoin]);

  return (
    <div className="relative overflow-hidden rounded-2xl neon-panel">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={() => (status === "playing" ? doJump() : start())}
        className="block w-full cursor-pointer touch-none select-none"
        style={{ aspectRatio: `${W} / ${H}` }}
        aria-label="Área de jogo JumpCoins"
      />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 text-sm">
        <div className="flex items-center gap-4 rounded-xl bg-background/60 px-3 py-2 backdrop-blur">
          <span className="font-mono text-neon-cyan neon-text">{hud.score} pts</span>
          <span className="font-mono text-neon-pink">🪙 {hud.coins}</span>
          <span className="font-mono">{"❤️".repeat(hud.lives) || "💀"}</span>
        </div>
        <div className="w-44 rounded-xl bg-background/60 p-2 backdrop-blur">
          <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>PROGRESSO</span>
            <span>{Math.round(hud.progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-neon-green transition-[width] duration-150"
              style={{ width: `${hud.progress}%` }}
            />
          </div>
        </div>
      </div>

      {status !== "playing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/75 text-center backdrop-blur-sm">
          <h2 className="text-3xl font-black tracking-tight text-neon-green neon-text">
            {status === "idle" ? "JUMPCOINS" : status === "won" ? "PARTIDA VENCIDA!" : "FIM DE JOGO"}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {status === "idle"
              ? "Espaço, ↑ ou clique para pular (pulo duplo). Desvie dos obstáculos, colete moedas neon e chegue a 100%."
              : `Pontuação ${hud.score} • ${hud.coins} moedas • ${Math.round(hud.progress)}% do percurso`}
          </p>
          <button
            onClick={start}
            className="rounded-xl bg-neon-green px-6 py-3 font-bold text-primary-foreground neon-glow transition hover:brightness-110"
          >
            {status === "idle" ? "▶ JOGAR" : "↻ JOGAR NOVAMENTE"}
          </button>
        </div>
      )}
    </div>
  );
}
