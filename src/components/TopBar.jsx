import React from "react";

export default function TopBar({ screen, activeGame, onGoMenu, onReboot }) {
  return (
    <div className="topbar card">
      <div className="topbar-left">
        <span className="chip">STATUS: {screen.toUpperCase()}</span>
        {activeGame && (
          <span className="chip">
            NOW PLAYING: {activeGame.emoji} {activeGame.title}
          </span>
        )}
      </div>

      <div className="topbar-right">
        <button className="btn" onClick={onGoMenu}>Menú</button>
        <button className="btn btn-primary" onClick={onReboot}>Reboot</button>
      </div>
    </div>
  );
}