import React, { useMemo, useState } from "react";

export default function CannonTrainer({ onExit }) {
  // Config base (tu app.js)
  const MIN_ANGLE = 1;
  const MAX_ANGLE = 89;
  const MAX_ATTEMPTS = 5;
  const TOLERANCE = 100;
  const BASE_MAX_RANGE = 5000;

  const targets = useMemo(
    () => [
      { id: 1, distance: 1200 },
      { id: 2, distance: 2800 },
      { id: 3, distance: 3500 },
    ],
    []
  );

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }
  function randomMaxRange() {
    const jitter = 0.85 + Math.random() * 0.3; // 0.85..1.15
    return Math.round(BASE_MAX_RANGE * jitter);
  }
  function computeRange(angleDeg, maxRangeA) {
    const theta = degToRad(angleDeg);
    const R = maxRangeA * Math.sin(2 * theta);
    return Math.max(0, R);
  }
  function abs(n) {
    return n < 0 ? -n : n;
  }
  function evaluateShot(range, targetDistance) {
    const diff = range - targetDistance;
    const within = abs(diff) <= TOLERANCE;

    if (within) return { type: "hit", result: "🎯 ¡Impacto!", diff };
    if (diff < 0) return { type: "short", result: "⬇️ Corto", diff };
    return { type: "long", result: "⬆️ Largo", diff };
  }

  const [targetIndex, setTargetIndex] = useState(0);
  const [attempt, setAttempt] = useState(1);
  const [hits, setHits] = useState(0);
  const [finished, setFinished] = useState(false);

  const [angle, setAngle] = useState(45);
  const [shots, setShots] = useState([]);
  const [maxRangeA, setMaxRangeA] = useState(randomMaxRange());

  const [banner, setBanner] = useState({ kind: "banner-info", text: "Ajusta el ángulo y dispara." });

  const currentTarget = targets[targetIndex];

  function nextTarget() {
    const next = targetIndex + 1;

    if (next >= targets.length) {
      setFinished(true);
      setBanner({ kind: "banner-ok", text: `✅ Fin del juego — Hits: ${hits}/${targets.length}` });
      return;
    }

    setTargetIndex(next);
    setAttempt(1);
    setAngle(45);
    setShots([]);
    setMaxRangeA(randomMaxRange());
    setBanner({ kind: "banner-info", text: "Nuevo objetivo cargado. Ajusta el ángulo y dispara." });
  }

  function onShoot() {
    if (finished) return;

    const t = currentTarget;
    const ang = clamp(Number(angle), MIN_ANGLE, MAX_ANGLE);

    const range = computeRange(ang, maxRangeA);
    const ev = evaluateShot(range, t.distance);

    const shot = {
      attempt,
      angle: ang,
      range,
      diff: ev.diff,
      diffSign: ev.diff >= 0 ? "+" : "-",
      result: ev.result,
    };

    setShots((prev) => [shot, ...prev]);

    if (ev.type === "hit") {
      const newHits = hits + 1;
      setHits(newHits);
      setBanner({ kind: "banner-ok", text: "🎯 ¡Impacto! Pasamos al siguiente objetivo…" });
      setTimeout(() => {
        // ojo: hits state se actualiza async, pero para el fin final usamos newHits si aplica
        setHits(newHits);
        nextTarget();
      }, 450);
      return;
    }

    if (ev.type === "short") setBanner({ kind: "banner-warn", text: "⬇️ Te quedaste corto. Ajusta y vuelve a intentar." });
    if (ev.type === "long") setBanner({ kind: "banner-warn", text: "⬆️ Te pasaste. Ajusta y vuelve a intentar." });

    if (attempt >= MAX_ATTEMPTS) {
      setBanner({ kind: "banner-danger", text: "💥 Se acabaron los intentos. Siguiente objetivo…" });
      setTimeout(nextTarget, 650);
      return;
    }

    setAttempt((a) => a + 1);
  }

  function resetAll() {
    setTargetIndex(0);
    setAttempt(1);
    setHits(0);
    setFinished(false);
    setAngle(45);
    setShots([]);
    setMaxRangeA(randomMaxRange());
    setBanner({ kind: "banner-info", text: "Nuevo juego. Ajusta el ángulo y dispara." });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") onShoot();
  }

  return (
    <section className="grid" onKeyDown={handleKeyDown} tabIndex={0}>
      <article className="card">
        <div className="card-header">
          <h2>🎯 Cannon Trainer</h2>
          <span className="muted">{finished ? "FIN" : `A = ${maxRangeA} m`}</span>
        </div>

        <div className="btnbar" style={{ marginBottom: 10 }}>
          <button className="btn" onClick={onExit}>Salir</button>
          <button className="btn" onClick={resetAll}>Reiniciar</button>
          <button className="btn btn-primary" onClick={onShoot} disabled={finished}>
            Disparar
          </button>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="label">Objetivo</div>
            <div className="value">
              {finished ? "—" : `${currentTarget.distance} m (obj ${targetIndex + 1}/${targets.length})`}
            </div>
          </div>
          <div className="stat">
            <div className="label">Intento</div>
            <div className="value">{finished ? "—" : `${attempt}/${MAX_ATTEMPTS}`}</div>
          </div>
          <div className="stat">
            <div className="label">Hits</div>
            <div className="value">{hits}/{targets.length}</div>
          </div>
        </div>

        <div className={`banner ${banner.kind}`}>{banner.text}</div>

        <div className="control">
          <label className="control-label">
            Ángulo: <span className="neon">{angle}</span>°
          </label>

          <input
            type="range"
            min={MIN_ANGLE}
            max={MAX_ANGLE}
            value={angle}
            disabled={finished}
            onChange={(e) => setAngle(clamp(Number(e.target.value), MIN_ANGLE, MAX_ANGLE))}
          />

          <div className="control-row">
            <input
              type="number"
              min={MIN_ANGLE}
              max={MAX_ANGLE}
              value={angle}
              disabled={finished}
              onChange={(e) => setAngle(clamp(Number(e.target.value), MIN_ANGLE, MAX_ANGLE))}
            />
            <div className="muted" style={{ fontFamily: "var(--font-mono)" }}>
              R = A × sin(2θ)
            </div>
          </div>
        </div>
      </article>

      <article className="card">
        <div className="card-header">
          <h2>Historial</h2>
          <span className="muted">{shots.length} tiro(s)</span>
        </div>

        <div className={`history ${shots.length ? "" : "muted"}`}>
          {!shots.length && "Aún no hay tiros registrados."}

          {shots.map((s, idx) => (
            <div key={`${s.attempt}-${idx}`} className="history-item">
              <div><strong>#{s.attempt}</strong></div>
              <div>θ: {s.angle}°</div>
              <div>
                R: {Math.round(s.range)} m — <strong>{s.result}</strong> ({s.diffSign}{Math.round(abs(s.diff))} m)
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}