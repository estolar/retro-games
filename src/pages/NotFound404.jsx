import React from "react";
import { Link, useLocation } from "react-router-dom";
import bg404 from "../assets/404-player-lost.png";

export default function NotFound404() {
  const location = useLocation();

  return (
    <main className="nf404" aria-labelledby="nf404-title">
      <div
        className="nf404__bg"
        style={{ backgroundImage: `url(${bg404})` }}
        role="img"
        aria-label="Pantalla 404 estilo arcade con alien pixelado y mensaje SIGNAL LOST"
      />

      <section className="nf404__overlay">
        <h1 id="nf404-title" className="nf404__srOnly">
          Error 404 — Ruta no encontrada
        </h1>

        <p className="nf404__srOnly">
          No existe la ruta: <strong>{location.pathname}</strong>
        </p>

        <nav className="nf404__actions" aria-label="Acciones">
          <Link className="btn btn-primary" to="/">
            Volver al Arcade
          </Link>

          <a className="btn" href="/">
            Ir a Inicio
          </a>
        </nav>

        <p className="nf404__tip" aria-live="polite">
          Tip: revisa si tu carpeta es <span>/retro-arcade/</span> o{" "}
          <span>/retro-games/</span>
        </p>
      </section>
    </main>
  );
}