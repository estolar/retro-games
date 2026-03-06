import React, { useMemo, useState } from "react";
import { GAMES } from "./data/games";
import BootScreen from "./components/BootScreen";
import GameMenu from "./components/GameMenu";
import TopBar from "./components/TopBar";

import SpaceInvaders from "./games/SpaceInvaders";
import CannonTrainer from "./games/CannonTrainer";
import NotFound404 from "./pages/NotFound404";

export default function App() {
  const [screen, setScreen] = useState("boot"); // boot | menu | game
  const [activeGameId, setActiveGameId] = useState(null);

  const activeGame = useMemo(
    () => GAMES.find((g) => g.id === activeGameId) || null,
    [activeGameId]
  );

  function goMenu() {
    setActiveGameId(null);
    setScreen("menu");
  }

  function startGame(gameId) {
    setActiveGameId(gameId);
    setScreen("game");
  }

  return (
    <div className="crt">
      <div className="container">
        <header className="header">
          <h1>RETRO ARCADE</h1>
          <p className="subtitle">Selecciona un juego y entra al multiverso de los píxeles.</p>
        </header>

        {screen !== "boot" && (
          <TopBar
            screen={screen}
            activeGame={activeGame}
            onGoMenu={goMenu}
            onReboot={() => setScreen("boot")}
          />
        )}

        {screen === "boot" && (
          <BootScreen onContinue={() => setScreen("menu")} />
        )}

        {screen === "menu" && (
          <GameMenu games={GAMES} onPlay={(id) => startGame(id)} />
        )}

        {screen === "game" && activeGameId === "space-invaders" && (
          <SpaceInvaders onExit={goMenu} />
        )}

        {screen === "game" && activeGameId === "cannon-trainer" && (
          <CannonTrainer onExit={goMenu} />
        )}

        <footer className="footer muted">
          Proyecto desarrollado por <strong>Enrique Stolar</strong> para el curso <strong>Desarrollo de Interfaces 2</strong>.
        </footer>
      </div>
    </div>
  );
}