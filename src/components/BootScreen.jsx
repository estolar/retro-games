import React, { useEffect, useState } from "react";
import ArcadeShowcase from "./ArcadeShowcase";

export default function BootScreen({ onContinue }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="card boot">
      <ArcadeShowcase />

      <div className="boot-title arcade-blink">INSERT COIN</div>

      <div className="coin-slot-wrap" aria-hidden="true">
        <div className="coin-slot-machine">
          <div className="coin-drop" />
          <div className="coin-slot" />
        </div>
      </div>

      <div className="boot-lines">
        <div>▶ Inicializando CRT… OK</div>
        <div>▶ Cargando sprites imaginarios… OK</div>
        <div>
          ▶ Preparando nostalgia… <span className="neon">MAX</span>
        </div>
      </div>

      <div className="boot-action">
        <button
          className="btn btn-primary"
          onClick={onContinue}
          disabled={!ready}
          title={!ready ? "Cargando…" : "Entrar"}
        >
          {ready ? "START" : "LOADING…"}
        </button>

        <div className="muted boot-hint">
          (Si escuchas el “beep” en tu cabeza: funciona.)
        </div>
      </div>
    </section>
  );
}