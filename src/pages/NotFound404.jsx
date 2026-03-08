import React from "react";
import { Link, useLocation } from "react-router-dom";
import bg404 from "../assets/404-player-lost.png";

const tips = [
  "¿Has probado a reiniciar el juego?",
  "Asegúrate de que tu carpeta es /retro-arcade/",
  "Intenta navegar a la página de inicio"
];

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

        <p className="nf404__tip">
          Tip: <span>{tips[Math.floor(Math.random() * tips.length)]}</span>
        </p>

      </section>
    </main>
  );
}