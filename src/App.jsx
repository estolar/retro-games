import React from "react";
import { Routes, Route } from "react-router-dom";
import ArcadeApp from "./ArcadeApp";
import NotFound404 from "./pages/NotFound404";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ArcadeApp />} />
      <Route path="*" element={<NotFound404 />} />
    </Routes>
  );
}