import React, { useEffect, useState } from "react";

export default function BootScreen({ onContinue }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="card boot">
      <div className="boot-title">INSERT COIN</div>

      <div className="boot-lines">
        <div>▶ Inicializando CRT… OK</div>
        <div>▶ Cargando sprites imaginarios… OK</div>
        <div>▶ Preparando nostalgia… <span className="neon">MAX</span></div>
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