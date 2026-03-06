import React, { useEffect, useMemo, useRef, useState } from "react";

export default function SpaceInvaders({ onExit }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  const [hud, setHud] = useState({ score: 0, lives: 3, level: 1, msg: "" });
  const [muted, setMuted] = useState(false);

  const ui = useMemo(() => {
    return {
      updateHUD(next) {
        setHud((h) => ({ ...h, ...next }));
      },
      centerMsg(msg) {
        setHud((h) => ({ ...h, msg }));
      },
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ---------- Utils ----------
    const rand = (min, max) => Math.random() * (max - min) + min;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------- HiDPI fit ----------
    function fitHiDPI(c) {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const cssW = Math.min(800, Math.floor(window.innerWidth - 48));
      const cssH = clamp(Math.floor(cssW * 0.75), 420, 600);
      c.style.width = cssW + "px";
      c.style.height = cssH + "px";
      c.width = Math.floor(cssW * dpr);
      c.height = Math.floor(cssH * dpr);
      const ctx = c.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, cssW, cssH };
    }

    // ---------- Minimal Audio (WebAudio) ----------
    const AudioSys = (() => {
      const AC = window.AudioContext || window.webkitAudioContext;
      let ctx = null;

      function ensure() {
        if (!ctx) ctx = new AC();
      }
      function beep(type = "square", freq = 440, time = 0.07, gain = 0.02) {
        if (muted) return;
        ensure();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, ctx.currentTime);
        g.gain.value = gain;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + time);
      }
      function explosion() {
        beep("sawtooth", 100, 0.12, 0.05);
        beep("square", 60, 0.2, 0.04);
      }
      function shoot() {
        beep("square", 680, 0.06, 0.03);
      }
      function step() {
        beep("triangle", 220, 0.03, 0.015);
      }
      return { shoot, explosion, step };
    })();

    // ---------- Entities ----------
    class Player {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.lastShot = 0;
        this.rate = 220;
      }
      canShoot() {
        return performance.now() - this.lastShot > this.rate;
      }
      update(dt, w) {
        this.x = clamp(this.x + this.vx * dt, 20, w - 20);
      }
      draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = "#a7b4ff";
        ctx.fillRect(-12, -6, 24, 8);
        ctx.fillRect(-4, -12, 8, 6);
        ctx.fillStyle = "#7df9ff";
        ctx.fillRect(-2, -18, 4, 6);
        ctx.restore();
      }
    }

    class Invader {
      constructor(x, y, row) {
        this.x = x;
        this.y = y;
        this.row = row;
        this.alive = true;
      }
      draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        const c = ["#7cffae", "#9cfff6", "#ffd37c", "#ff9b9b", "#c7d0ff", "#d17cff"][this.row % 6];
        ctx.fillStyle = c;
        ctx.fillRect(-12, -8, 24, 16);
        ctx.fillStyle = "#0b0f17";
        ctx.fillRect(-6, -2, 4, 4);
        ctx.fillRect(2, -2, 4, 4);
        ctx.restore();
      }
    }

    class Shot {
      constructor(x, y, vy) {
        this.x = x;
        this.y = y;
        this.vy = vy;
        this.active = true;
      }
      update(dt) {
        this.y += this.vy * dt;
        if (this.y < -20 || this.y > 620) this.active = false;
      }
    }

    class Particle {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = rand(-80, 80);
        this.vy = rand(-120, -40);
        this.life = rand(0.3, 0.8);
        this.color = color;
      }
      update(dt) {
        this.life -= dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 240 * dt;
      }
      draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 2, 2);
        ctx.globalAlpha = 1;
      }
    }

    // ---------- Game ----------
    const Game = {
      init() {
        this.canvas = canvas;
        this.fit();
        this.reset();
        this.bindInput();
        this.loop(0);
      },
      fit() {
        const { ctx, cssW, cssH } = fitHiDPI(this.canvas);
        this.ctx = ctx;
        this.w = cssW;
        this.h = cssH;
      },
      reset(level = 1) {
        this.state = "menu"; // menu | play | paused | over
        this.level = level;
        this.score = 0;
        this.lives = 3;
        this.player = new Player(this.w / 2, this.h - 40);
        this.shots = [];
        this.enemyShots = [];
        this.particles = [];
        this.makeWave();
        ui.updateHUD({ score: this.score, lives: this.lives, level: this.level });
        ui.centerMsg("Pulsa START o ESPACIO para comenzar");
      },
      makeWave() {
        const rows = clamp(2 + this.level, 2, 6);
        const cols = 8 + Math.min(this.level * 2, 8);
        this.invaders = [];
        const marginX = 40,
          marginTop = 60;
        const spacingX = (this.w - marginX * 2) / (cols - 1);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = marginX + c * spacingX;
            const y = marginTop + r * 42;
            this.invaders.push(new Invader(x, y, r));
          }
        }
        this.invDir = 1;
        this.invStepTimer = 0;
        this.invShootTimer = 0;
      },
      bindInput() {
        this.keys = {};

        this.onKeyDown = (e) => {
          if (["ArrowLeft", "ArrowRight", " ", "KeyP", "KeyR"].includes(e.code)) e.preventDefault();
          this.keys[e.code] = true;

          if (e.code === "Space" && this.state !== "play") this.start();
          if (e.code === "KeyP") this.togglePause();
          if (e.code === "KeyR") this.restart();
        };

        this.onKeyUp = (e) => {
          this.keys[e.code] = false;
        };

        window.addEventListener("keydown", this.onKeyDown);
        window.addEventListener("keyup", this.onKeyUp);

        this.onResize = () => this.fit();
        window.addEventListener("resize", this.onResize);
      },
      cleanup() {
        window.removeEventListener("keydown", this.onKeyDown);
        window.removeEventListener("keyup", this.onKeyUp);
        window.removeEventListener("resize", this.onResize);
      },
      start() {
        if (this.state === "play") return;
        if (this.state === "menu" || this.state === "over") {
          this.level = 1;
          this.score = 0;
          this.lives = 3;
          this.player.x = this.w / 2;
          this.shots = [];
          this.enemyShots = [];
          this.particles = [];
          this.makeWave();
          ui.updateHUD({ score: this.score, lives: this.lives, level: this.level });
        }
        this.state = "play";
        ui.centerMsg("");
      },
      togglePause() {
        if (this.state === "play") {
          this.state = "paused";
          ui.centerMsg("PAUSA — P para reanudar");
        } else if (this.state === "paused") {
          this.state = "play";
          ui.centerMsg("");
        }
      },
      restart() {
        this.reset(this.level);
      },
      playerShoot() {
        if (this.player.canShoot()) {
          this.shots.push(new Shot(this.player.x, this.player.y - 16, -420));
          AudioSys.shoot();
          this.player.lastShot = performance.now();
        }
      },
      explode(x, y, color) {
        for (let i = 0; i < 24; i++) this.particles.push(new Particle(x, y, color));
      },
      hitPlayer() {
        this.lives--;
        ui.updateHUD({ lives: this.lives });
        AudioSys.explosion();
        this.explode(this.player.x, this.player.y, "#ff6b6b");
        if (this.lives <= 0) {
          this.state = "over";
          ui.centerMsg("GAME OVER — R para reiniciar");
        } else {
          this.player.x = this.w / 2;
          this.enemyShots.length = 0;
        }
      },
      nextLevel() {
        this.level++;
        this.makeWave();
        ui.updateHUD({ level: this.level });
        ui.centerMsg("NIVEL " + this.level + "!");
        setTimeout(() => ui.centerMsg(""), 900);
      },
      bottomRowInvaders() {
        const cols = {};
        for (const inv of this.invaders) {
          const key = Math.round(inv.x / 18);
          if (!cols[key] || cols[key].y < inv.y) cols[key] = inv;
        }
        return Object.values(cols).filter((i) => i.alive);
      },
      aliveInvaders() {
        return this.invaders.reduce((a, i) => a + (i.alive ? 1 : 0), 0);
      },
      update(dt) {
        if (this.state !== "play") return;

        const k = this.keys;
        if (k["ArrowLeft"]) this.player.vx = -260;
        else if (k["ArrowRight"]) this.player.vx = 260;
        else this.player.vx = 0;

        if (k["Space"]) this.playerShoot();

        this.player.update(dt, this.w);
        this.shots.forEach((s) => s.update(dt));
        this.enemyShots.forEach((s) => s.update(dt));
        this.particles.forEach((p) => p.update(dt));

        // invaders step movement
        this.invStepTimer += dt;
        const stepEvery = clamp(0.8 - this.aliveInvaders() * 0.003 - this.level * 0.05, 0.12, 0.8);
        if (this.invStepTimer >= stepEvery) {
          this.invStepTimer = 0;
          AudioSys.step();
          let edgeHit = false;
          for (const inv of this.invaders) {
            if (!inv.alive) continue;
            inv.x += this.invDir * 18;
            if (inv.x < 24 || inv.x > this.w - 24) edgeHit = true;
          }
          if (edgeHit) {
            this.invDir *= -1;
            for (const inv of this.invaders) if (inv.alive) inv.y += 16;
          }
        }

        // invaders shoot
        this.invShootTimer += dt;
        if (this.invShootTimer > clamp(1.1 - this.level * 0.08, 0.35, 1.3)) {
          this.invShootTimer = 0;
          const shooters = this.bottomRowInvaders();
          if (shooters.length) {
            const inv = shooters[Math.floor(Math.random() * shooters.length)];
            this.enemyShots.push(new Shot(inv.x, inv.y + 10, 240));
          }
        }

        // collisions player shots vs invaders
        for (const b of this.shots) {
          if (!b.active) continue;
          for (const inv of this.invaders) {
            if (!inv.alive) continue;
            if (Math.abs(b.x - inv.x) < 12 && Math.abs(b.y - inv.y) < 12) {
              inv.alive = false;
              b.active = false;
              this.score += 10 + inv.row * 5;
              ui.updateHUD({ score: this.score });
              this.explode(inv.x, inv.y, "#7cffae");
              AudioSys.explosion();
            }
          }
        }

        // enemy shots vs player
        for (const eb of this.enemyShots) {
          if (!eb.active) continue;
          if (Math.abs(eb.x - this.player.x) < 14 && Math.abs(eb.y - this.player.y) < 10) {
            eb.active = false;
            this.hitPlayer();
          }
        }

        this.shots = this.shots.filter((s) => s.active);
        this.enemyShots = this.enemyShots.filter((s) => s.active);
        this.particles = this.particles.filter((p) => p.life > 0);

        if (this.invaders.every((i) => !i.alive)) this.nextLevel();
        if (this.invaders.some((i) => i.alive && i.y > this.h - 80)) {
          this.state = "over";
          ui.centerMsg("INVADIDO — R para reiniciar");
        }
      },
      render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.w, this.h);

        // stars
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "#0f1730";
        for (let i = 0; i < 80; i++) ctx.fillRect((i * 37) % this.w, (i * 59) % this.h, 2, 2);
        ctx.globalAlpha = 1;

        this.player.draw(ctx);
        for (const inv of this.invaders) inv.draw(ctx);

        ctx.fillStyle = "#7df9ff";
        for (const b of this.shots) if (b.active) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);

        ctx.fillStyle = "#ff9b9b";
        for (const b of this.enemyShots) if (b.active) ctx.fillRect(b.x - 2, b.y - 4, 4, 8);

        for (const p of this.particles) p.draw(ctx);
      },
      loop(ts) {
        if (!this._lt) this._lt = ts;
        const dt = (ts - this._lt) / 1000;
        this._lt = ts;

        if (this.state === "play") this.update(dt);
        this.render();

        rafRef.current = requestAnimationFrame((t) => this.loop(t));
      },
    };

    Game.init();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      Game.cleanup();
    };
  }, [muted, ui]);

  return (
    <section className="card">
      <div className="card-header">
        <h2>👾 Space Invaders</h2>
        <span className="muted">Canvas</span>
      </div>

      <div className="btnbar">
        <button className="btn" onClick={onExit}>Salir</button>
        <button className="btn" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }))}>
          START
        </button>
        <button className="btn" onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyP" }))}>
          Pausa (P)
        </button>
        <button className="btn btn-primary" onClick={() => setMuted((m) => !m)}>
          Sonido: {muted ? "OFF" : "ON"}
        </button>
      </div>

      <div className="legend muted" style={{ marginBottom: 10 }}>
        Controles: ← → mover | Espacio disparar | P pausar | R reiniciar
      </div>

      <div className="spaceWrap">
        <canvas ref={canvasRef} className="spaceCanvas" aria-label="Lienzo Space Invaders" />
        <div className="spaceHud" aria-hidden="true">
          <div className="spaceHudTop">
            <div>💯 Puntos: <span>{hud.score}</span></div>
            <div>❤️ Vidas: <span>{hud.lives}</span> &nbsp;|&nbsp; 🚀 Nivel: <span>{hud.level}</span></div>
          </div>
          <div className="spaceHudCenter">{hud.msg}</div>
        </div>
      </div>
    </section>
  );
}