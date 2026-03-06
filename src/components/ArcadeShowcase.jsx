import React from "react";

export default function ArcadeShowcase() {
  return (
    <section className="arcade-showcase card" aria-label="Arcade attract mode">
      <div className="showcase-screen">
        <div className="showcase-overlay" />

        {/* FILA 1: personaje come-píxeles + fantasmas */}
        <div className="lane lane-top">
          <div className="maze-line" />
          <div className="chaser" />
          <div className="ghost ghost-1" />
          <div className="ghost ghost-2" />
          <div className="ghost ghost-3" />
          <div className="ghost ghost-4" />

          <div className="pellet pellet-1" />
          <div className="pellet pellet-2" />
          <div className="pellet pellet-3" />
          <div className="pellet pellet-4" />
          <div className="pellet pellet-5" />
        </div>

        {/* FILA 2: tanques tipo combat */}
        <div className="lane lane-middle">
          <div className="tank tank-left">
            <span className="tank-body" />
            <span className="tank-cannon" />
          </div>

          <div className="tank tank-right">
            <span className="tank-body" />
            <span className="tank-cannon" />
          </div>

          <div className="shot shot-1" />
          <div className="shot shot-2" />
        </div>

        {/* FILA 3: corredor tipo aventura */}
        <div className="lane lane-bottom">
          <div className="vine vine-1" />
          <div className="vine vine-2" />
          <div className="platform platform-1" />
          <div className="platform platform-2" />
          <div className="runner" />
        </div>

        <div className="showcase-label">ARCADE ATTRACT MODE</div>
      </div>
    </section>
  );
}