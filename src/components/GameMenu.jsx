import React from "react";

export default function GameMenu({ games, onPlay }) {
  return (
    <section className="grid">
      {games.map((g) => (
        <article key={g.id} className="card gamecard">
          <div className="card-header">
            <h2>{g.emoji} {g.title}</h2>
            <span className="muted">READY</span>
          </div>

          <div className="muted" style={{ marginBottom: 12 }}>
            {g.tagline}
          </div>

          <div className="banner banner-info">
            Controles: {g.controls}
          </div>

          <button className="btn btn-primary" onClick={() => onPlay(g.id)}>
            JUGAR
          </button>
        </article>
      ))}
    </section>
  );
}