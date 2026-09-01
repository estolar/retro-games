import React, { useEffect, useRef, useState } from "react";
import GameShell from "../components/GameShell";

const API_URL = process.env.REACT_APP_AI_API_URL || "";
const API_PATH = process.env.REACT_APP_AI_API_PATH || "/api/ai/chat";
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const AUDIO_SRC = `${PUBLIC_URL}/audio/caballito-pixelado.mp3`;
const IMAGE_SRC = `${PUBLIC_URL}/images/chacalon-arcade.png`;
const WINK_IMAGE_SRC = `${PUBLIC_URL}/images/chacalon-arcade-wink.png`;
const BODY_MOTION_SRC = `${PUBLIC_URL}/images/chacalon-arcade-body.png`;
const SALUTE_IMAGE_SRC = `${PUBLIC_URL}/images/chacalon-arcade-salute.png`;
const LOCAL_CONTEXT_URL = `${PUBLIC_URL.replace(/\/$/, "")}/data/context.json`;
const PRODUCTION_CONTEXT_URL =
  "https://raw.githubusercontent.com/estolar/retro-games/main/public/data/context.json";
const CONTEXT_URL =
  process.env.REACT_APP_CONTEXT_URL ||
  (process.env.NODE_ENV === "production" ? PRODUCTION_CONTEXT_URL : LOCAL_CONTEXT_URL);
const CONTEXT_REFRESH_INTERVAL = 60 * 60 * 1000;
const PLAYER_NAME_STORAGE_KEY = "retro-games.chacalon.player-name";
const PLAYER_PROFILE_STORAGE_KEY = "retro-games.chacalon.profile";
const MAX_SAVED_ANSWERS = 20;
const MAX_SAVED_ANSWER_LENGTH = 240;
const AI_REQUEST_TIMEOUT_MS = 30_000;

function formatAudioTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function shouldUseDailyContext(message) {
  return /actualidad|noticia|hoy|ahora|pol[ií]tica|keiko|ministro|gobierno|presidente|congreso|econom[ií]a|sociedad|seguridad|d[oó]lar|inflaci[oó]n|precio|empleo|trabajo|negocio|empresa|emprend|inversi[oó]n|mercado|innovaci[oó]n|tecnolog[ií]a|inteligencia artificial|\bia\b|idea|redes sociales|viral|tendencia|far[aá]ndula|espect[aá]culo|chisme|evento|qu[eé] hacer|d[oó]nde (comer|ir)|recom|lugar|restaurante|discoteca|cebicher[ií]a|barrio/i.test(
    message
  );
}

function shouldTriggerSalute(message) {
  return /\b(salud|chela|chelas|helena|helenas|helada|heladas|cerveza|cervezas|trago|tragos|brindis|tomar|tomamos|copa|copas)\b/i.test(
    message
  );
}

const INTRO_MESSAGE = {
  id: "intro",
  role: "assistant",
  text: "¡Hola, mi hermano! Soy Chacalón Virtual, un homenaje interactivo. Antes de empezar, dime cómo te llamas, causa. ¿Con qué nombre te recibo?",
};

function readStoredProfile() {
  if (typeof window === "undefined") return { name: "", answers: [] };

  try {
    const storedProfile = window.localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (storedProfile) {
      const profile = JSON.parse(storedProfile);
      return {
        name: typeof profile.name === "string" ? profile.name.slice(0, 40) : "",
        answers: Array.isArray(profile.answers)
          ? profile.answers
              .filter((answer) => typeof answer === "string")
              .map((answer) => answer.slice(0, MAX_SAVED_ANSWER_LENGTH))
              .slice(-MAX_SAVED_ANSWERS)
          : [],
      };
    }

    return {
      name: window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || "",
      answers: [],
    };
  } catch {
    return { name: "", answers: [] };
  }
}

function storePlayerProfile(name, answers = []) {
  try {
    const profile = {
      name: name.slice(0, 40),
      answers: answers.slice(-MAX_SAVED_ANSWERS),
    };
    window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, profile.name);
  } catch {
    // Si el navegador bloquea localStorage, el nombre queda disponible durante la sesión.
  }
}

function createIntroMessage(playerName) {
  if (!playerName) return INTRO_MESSAGE;

  return {
    ...INTRO_MESSAGE,
    text: `¡Hola de nuevo, ${playerName}! Qué gusto verte por aquí, mi hermano. ¿Qué juego quieres jugar hoy?`,
  };
}

function extractRequestedName(message) {
  const patterns = [
    /(?:cambia(?:r)?\s+mi\s+nombre\s+(?:a|por)|mi\s+nombre\s+es|me\s+llamo|ll[aá]mame|quiero\s+que\s+me\s+llames)\s+(.+)/i,
    /(?:quiero\s+que\s+)?(?:me\s+)?cambi(?:a|e|ar|es)\s+(?:mi\s+nombre\s+)?(?:de\s+)?[^,.!?]+?\s+(?:a|por)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (!match) continue;

    const name = match[1]
      .split(/\s+(?:por favor|desde ahora|ahora)\b/i)[0]
      .replace(/[.,!?;:]+$/, "")
      .trim()
      .slice(0, 40);

    if (name) return name;
  }

  return "";
}

const FALLBACK_REPLIES = [
  "La señal está descansando, causa. Prueba un juego y volvemos con fe.",
  "La máquina pide una pausa. Dale a Space Invaders, Pong o Breakout y seguimos.",
  "Aunque se corte la señal, las ganas siguen. ¿Qué juego quieres dominar?",
];

function getFallbackReply(message) {
  const normalizedMessage = message.toLowerCase();

  if (/(?:deseo|ojal[aá]|conc[eé]deme|cumple mi deseo)/i.test(message)) {
    const wish = message
      .replace(/^(?:yo\s+)?(?:deseo|ojal[aá]|conc[eé]deme(?:\s+un)?\s+deseo|cumple mi deseo)\s*:?[\s]*/i, "")
      .trim();

    return wish
      ? `Tu deseo es ${wish}. Con fe, causa, que se te cumpla y se haga realidad.`
      : "Dime tu deseo, causa, y lo recibimos con fe para que se te cumpla.";
  }

  if (normalizedMessage.includes("juego")) {
    return "Prueba Space Invaders, Pong o Breakout, causa. ¿Cuál te vacila más?";
  }

  if (normalizedMessage.includes("música") || normalizedMessage.includes("chicha")) {
    return "La música chicha tiene barrio y corazón. ¿Qué canción o ritmo te trae recuerdos?";
  }

  return FALLBACK_REPLIES[message.length % FALLBACK_REPLIES.length];
}

function toApiHistory(messages) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-8)
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      text: message.text,
    }));
}

export default function ChacalonChat({ onExit }) {
  const [profile] = useState(readStoredProfile);
  const [playerName, setPlayerName] = useState(profile.name);
  const [savedAnswers, setSavedAnswers] = useState(profile.answers);
  const [messages, setMessages] = useState(() => [
    createIntroMessage(profile.name),
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("READY");
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const audioRef = useRef(null);
  const portraitFrameRef = useRef(null);
  const visualizerCanvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioSourceRef = useRef(null);
  const musicPausedByUserRef = useRef(false);
  const animationFrameRef = useRef(null);
  const visualizerDataRef = useRef(null);
  const [musicBlocked, setMusicBlocked] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.35);
  const volumeRef = useRef(0.35);
  const [dailyContext, setDailyContext] = useState(null);
  const [isWinking, setIsWinking] = useState(false);
  const [isSaluting, setIsSaluting] = useState(false);
  const saluteTimerRef = useRef(null);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (status === "CONNECTING" || typeof inputRef.current?.focus !== "function") return undefined;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [messages, playerName, status]);

  useEffect(() => {
    if (process.env.NODE_ENV === "test" || typeof fetch !== "function") return undefined;

    let active = true;
    const loadDailyContext = () => {
      const cacheBuster = Math.floor(Date.now() / CONTEXT_REFRESH_INTERVAL);
      fetch(`${CONTEXT_URL}?v=${cacheBuster}`, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((context) => {
          if (active && context && typeof context === "object") setDailyContext(context);
        })
        .catch(() => {
          // El chat sigue funcionando aunque el contexto diario no esté disponible.
        });
    };

    loadDailyContext();
    const refreshTimer = window.setInterval(loadDailyContext, CONTEXT_REFRESH_INTERVAL);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => () => window.clearTimeout(saluteTimerRef.current), []);

  function triggerSalute() {
    window.clearTimeout(saluteTimerRef.current);
    setIsSaluting(true);
    saluteTimerRef.current = window.setTimeout(() => setIsSaluting(false), 1800);
  }

  useEffect(() => {
    if (process.env.NODE_ENV === "test") return undefined;

    let active = true;
    let winkTimer;
    let winkEndTimer;

    const scheduleWink = () => {
      winkTimer = window.setTimeout(() => {
        if (!active) return;

        setIsWinking(true);
        winkEndTimer = window.setTimeout(() => {
          if (!active) return;
          setIsWinking(false);
          scheduleWink();
        }, 140);
      }, 3600 + Math.random() * 4200);
    };

    scheduleWink();
    return () => {
      active = false;
      window.clearTimeout(winkTimer);
      window.clearTimeout(winkEndTimer);
    };
  }, []);

  function setupAudioVisualizer() {
    const audio = audioRef.current;
    const canvas = visualizerCanvasRef.current;
    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!audio || !canvas || !AudioContext || audioSourceRef.current) return;

    try {
      const context = audioContextRef.current || new AudioContext();
      if (context.state === "suspended") {
        context.close?.();
        return;
      }
      const analyser = context.createAnalyser();
      const source = context.createMediaElementSource(audio);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(context.destination);

      audioContextRef.current = context;
      analyserRef.current = analyser;
      audioSourceRef.current = source;
      visualizerDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch {
      // El reproductor sigue funcionando aunque Web Audio no esté disponible.
    }
  }

  function startVisualizer() {
    const canvas = visualizerCanvasRef.current;
    const analyser = analyserRef.current;
    const data = visualizerDataRef.current;
    if (!canvas || !analyser || !data || animationFrameRef.current) return;

    const draw = () => {
      const context = canvas.getContext("2d");
      if (!context) return;

      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      const width = Math.max(bounds.width, 320);
      const height = Math.max(bounds.height, 180);

      if (canvas.width !== Math.floor(width * pixelRatio) || canvas.height !== Math.floor(height * pixelRatio)) {
        canvas.width = Math.floor(width * pixelRatio);
        canvas.height = Math.floor(height * pixelRatio);
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      analyser.getByteFrequencyData(data);

      const average = data.reduce((sum, value) => sum + value, 0) / data.length / 255;
      portraitFrameRef.current?.style.setProperty("--audio-energy", average.toFixed(3));
      const time = performance.now() / 1000;
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#080014");
      gradient.addColorStop(0.48, "#16051f");
      gradient.addColorStop(1, "#001719");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.globalAlpha = 0.18;
      context.strokeStyle = "#00ffff";
      context.lineWidth = 1;
      for (let line = 0; line < height; line += 4) {
        context.beginPath();
        context.moveTo(0, line + 0.5);
        context.lineTo(width, line + 0.5);
        context.stroke();
      }
      context.globalAlpha = 1;

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRingRadius = width * 0.54;
      const rings = [
        { size: 0.18, color: "#ff00ff", lineWidth: 2, glow: 14 },
        { size: 0.29, color: "#00ffff", lineWidth: 1, glow: 10 },
        { size: 0.4, color: "#fff300", lineWidth: 3, glow: 14 },
        { size: 0.52, color: "#39ff14", lineWidth: 1, glow: 10 },
        { size: 0.64, color: "#ff00ff", lineWidth: 2, glow: 12 },
        { size: 0.76, color: "#00ffff", lineWidth: 4, glow: 16 },
        { size: 0.89, color: "#fff300", lineWidth: 1, glow: 10 },
        { size: 1.02, color: "#39ff14", lineWidth: 3, glow: 14 },
      ];
      rings.forEach((ring, ringIndex) => {
        const pulse =
          1 + average * (0.4 + ringIndex * 0.04) +
          Math.sin(time * (3.5 + ringIndex * 0.45) + ringIndex) * 0.025;
        context.globalAlpha = 0.3 + average * 0.45;
        context.strokeStyle = ring.color;
        context.shadowBlur = ring.glow;
        context.shadowColor = ring.color;
        context.lineWidth = ring.lineWidth;
        context.beginPath();
        context.arc(centerX, centerY, maxRingRadius * ring.size * pulse, 0, Math.PI * 2);
        context.stroke();
      });
      context.globalAlpha = 1;
      context.shadowBlur = 0;

      const barCount = 40;
      const gap = Math.max(2, Math.min(5, width * 0.004));
      const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);
      const centerIndex = (barCount - 1) / 2;
      for (let index = 0; index < barCount; index += 1) {
        const spectrumIndex = Math.floor((index / barCount) * data.length);
        const value = (data[spectrumIndex] || 0) / 255;
        const distanceFromCenter = Math.abs(index - centerIndex) / centerIndex;
        const centerEnvelope = Math.max(0.24, 1 - distanceFromCenter * 0.76);
        const barHeight =
          6 + centerEnvelope * (22 + value * (height * 0.3) + average * 8);
        const x = index * (barWidth + gap);
        const hue = index % 3 === 0 ? "#fff300" : index % 2 === 0 ? "#00ffff" : "#ff00ff";
        context.fillStyle = hue;
        context.shadowBlur = 10;
        context.shadowColor = hue;
        context.fillRect(x, height - 18 - barHeight, barWidth, barHeight);
        context.fillRect(x, 18, barWidth, barHeight * 0.62);
      }
      context.shadowBlur = 0;

      context.beginPath();
      for (let x = 0; x <= width; x += 4) {
        const index = Math.floor((x / width) * data.length);
        const waveform = (data[index] || 0) / 255;
        const y = centerY + Math.sin((x / width) * Math.PI * 8 + time * 4) * (8 + waveform * 30);
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = "#55ff33";
      context.shadowBlur = 12;
      context.shadowColor = "#55ff33";
      context.lineWidth = 2;
      context.stroke();
      context.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);
  }

  async function startMusic({ userInitiated = false } = {}) {
    const audio = audioRef.current;
    if (!audio) return;
    if (userInitiated) musicPausedByUserRef.current = false;

    try {
      audio.volume = volumeRef.current;
      await audio.play();
    } catch {
      setMusicBlocked(true);
      setIsPlaying(false);
      return;
    }

    setMusicBlocked(false);
    setIsPlaying(true);

    try {
      setupAudioVisualizer();
      const context = audioContextRef.current;
      if (context?.state === "suspended") await context.resume();
      startVisualizer();
    } catch {
      // El audio nativo sigue funcionando aunque el visualizador falle.
    }
  }

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void startMusic({ userInitiated: true });
    } else {
      musicPausedByUserRef.current = true;
      audio.pause();
    }
  }

  function handleVolumeChange(event) {
    const nextVolume = Number(event.target.value);
    volumeRef.current = nextVolume;
    setVolume(nextVolume);
    if (audioRef.current) audioRef.current.volume = nextVolume;
  }

  function handleProgressChange(event) {
    const nextTime = Number(event.target.value);
    if (audioRef.current) audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    if (process.env.NODE_ENV === "test") return undefined;

    audio.volume = volumeRef.current;
    const unlockMusic = () => {
      if (musicPausedByUserRef.current) return;
      if (audio.paused || audioContextRef.current?.state === "suspended" || !audioSourceRef.current) {
        void startMusic();
      }
    };
    window.addEventListener("pointerdown", unlockMusic);
    window.addEventListener("keydown", unlockMusic);

    return () => {
      window.removeEventListener("pointerdown", unlockMusic);
      window.removeEventListener("keydown", unlockMusic);
      try {
        audio.pause();
      } catch {
        // Algunos entornos de prueba no implementan HTMLMediaElement.
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      audioSourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      audioContextRef.current?.close?.();
      audioSourceRef.current = null;
      analyserRef.current = null;
      audioContextRef.current = null;
    };
    // La inicialización del reproductor debe ejecutarse una sola vez por montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetChat() {
    setMessages([createIntroMessage(playerName)]);
    setInput("");
    setError("");
    setStatus("READY");
  }

  function rememberAnswer(answer) {
    const normalizedAnswer = answer.trim().slice(0, MAX_SAVED_ANSWER_LENGTH);
    const nextAnswers = [...savedAnswers, normalizedAnswer].slice(-MAX_SAVED_ANSWERS);
    setSavedAnswers(nextAnswers);
    storePlayerProfile(playerName, nextAnswers);
    return nextAnswers;
  }

  async function sendMessage(event) {
    event.preventDefault();
    const message = input.trim();

    if (!message || status === "CONNECTING") return;

    if (!playerName) {
      const name = message.split(/\r?\n/)[0].trim().slice(0, 40);
      storePlayerProfile(name, savedAnswers);
      setPlayerName(name);
      setMessages((current) => [
        ...current,
        {
          id: `player-name-${Date.now()}`,
          role: "user",
          text: name,
          playerName: name,
        },
        {
          id: `welcome-${Date.now()}`,
          role: "assistant",
          text: `¡Qué tal, ${name}! Bienvenido, causa. Que tengas salud, chamba y harta fe. ¿Qué jugamos?`,
        },
      ]);
      setInput("");
      setError("");
      setStatus("READY");
      return;
    }

    const requestedName = extractRequestedName(message);
    if (requestedName) {
      const messageId = Date.now();
      storePlayerProfile(requestedName, savedAnswers);
      setPlayerName(requestedName);
      setMessages((current) => [
        ...current,
        {
          id: `rename-${messageId}`,
          role: "user",
          text: message,
          playerName: requestedName,
        },
        {
          id: `rename-confirmation-${messageId}`,
          role: "assistant",
          text: `¡Hecho, ${requestedName}! Desde ahora te llamo ${requestedName}, causa. ¿Qué conversamos?`,
        },
      ]);
      setInput("");
      setError("");
      setStatus("READY");
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: message,
        playerName,
      },
    ]);
    setInput("");
    setError("");
    setStatus("CONNECTING");
    if (shouldTriggerSalute(message)) triggerSalute();
    const nextAnswers = rememberAnswer(message);
    const requestController = new AbortController();
    const timeoutId = window.setTimeout(
      () => requestController.abort(),
      AI_REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(
        `${API_URL.replace(/\/$/, "")}${API_PATH}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: requestController.signal,
          body: JSON.stringify({
            message,
            history: toApiHistory(messages),
            playerName,
            memory: nextAnswers,
            dailyContext: shouldUseDailyContext(message) ? dailyContext : null,
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      const reply = typeof payload.reply === "string" ? payload.reply.trim() : "";

      if (!response.ok) {
        throw new Error(payload.error || "AI server unavailable");
      }

      if (!reply) {
        throw new Error("AI server returned an empty response");
      }

      setMessages((current) => [
        ...current,
        {
          id: `model-${Date.now()}`,
          role: "assistant",
          text: reply,
        },
      ]);
      setStatus("ONLINE");
    } catch (error) {
      const timedOut = error?.name === "AbortError";
      setMessages((current) => [
        ...current,
        {
          id: `fallback-${Date.now()}`,
          role: "assistant",
          text: getFallbackReply(message),
          fallback: true,
        },
      ]);
      setError(
        timedOut
          ? "La IA está tardando demasiado: usamos el modo de respaldo local."
          : "IA no disponible: usamos el modo de respaldo local."
      );
      setStatus("OFFLINE");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <GameShell
      title="Conversando con Chacalón Virtual"
      emoji="🎙️"
      status={status}
      controls="Escribe tu mensaje y pulsa Enter | Shift + Enter para una nueva línea"
      onExit={onExit}
      actions={
        <button className="btn" onClick={resetChat} type="button">
          Reiniciar conversación
        </button>
      }
    >
      <div className="chacalon-notice">
        PERSONAJE VIRTUAL DE HOMENAJE · LA API KEY PERMANECE EN EL SERVIDOR
      </div>

      {dailyContext && (
        <div className="chacalon-context-status">
          CONTEXTO DEL DÍA · {dailyContext.region || "PERÚ"} · ACTUALIZADO
        </div>
      )}

      <div className="chacalon-player">
        <div className="chacalon-music__label">
          MÚSICA · CABALLITO PIXELADO · CANCIÓN COMPLETA EN LOOP
        </div>
        {musicBlocked && (
          <div className="chacalon-music__activation">
            <span>SI QUIERES UN CUMBIÓN CHACALONERO</span>
            <button
              className="btn chacalon-music__start"
              onClick={() => void startMusic({ userInitiated: true })}
              type="button"
            >
              ACTIVAR MÚSICA
            </button>
          </div>
        )}
        <div
          className="chacalon-visualizer"
          role="img"
          aria-label="Visualizador cumbiambero con ondas neon"
        >
          <canvas ref={visualizerCanvasRef} aria-hidden="true" />
          <div className="chacalon-visualizer__scanlines" aria-hidden="true" />
          <div className="chacalon-visualizer__overlay">
            <span>♪ CUMBIA SIGNAL</span>
            <span>{isPlaying ? "BAILANDO" : "EN PAUSA"}</span>
          </div>
        </div>
        <audio
          ref={audioRef}
          aria-label="Música de prueba 8-bit"
          loop
          preload="auto"
          className="chacalon-audio"
          onPlay={() => {
            setIsPlaying(true);
            setupAudioVisualizer();
            startVisualizer();
          }}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            setMusicBlocked(true);
            setIsPlaying(false);
          }}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
          src={AUDIO_SRC}
        >
          Tu navegador no permite reproducir este audio.
        </audio>
        <div className="chacalon-player__controls">
          <button
            className="chacalon-player__play"
            type="button"
            onClick={toggleMusic}
            aria-label={isPlaying ? "Pausar música" : "Reproducir música"}
          >
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          <span className="chacalon-player__time">{formatAudioTime(currentTime)}</span>
          <input
            className="chacalon-player__progress"
            type="range"
            aria-label="Progreso de la canción"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={handleProgressChange}
            disabled={!duration}
          />
          <span className="chacalon-player__time">{formatAudioTime(duration)}</span>
          <label className="chacalon-player__volume">
            VOL
            <input
              type="range"
              aria-label="Volumen de la música"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
            />
          </label>
        </div>
      </div>

      <div className="chacalon-main-grid">
        <div
          className={`chacalon-identity ${isPlaying ? "is-playing" : ""} ${
            isSaluting ? "is-saluting" : ""
          }`}
        >
          <div className="chacalon-identity__portrait-frame" ref={portraitFrameRef}>
            <img
              className="chacalon-identity__portrait"
              src={isWinking ? WINK_IMAGE_SRC : IMAGE_SRC}
              alt="Retrato arcade de Chacalón Virtual"
            />
            <img
              className="chacalon-identity__body-motion"
              src={BODY_MOTION_SRC}
              alt=""
              aria-hidden="true"
            />
            <img
              className="chacalon-identity__salute"
              src={SALUTE_IMAGE_SRC}
              alt=""
              aria-hidden="true"
            />
          </div>
          <div className="chacalon-identity__copy">
            <div className="chacalon-identity__eyebrow">TRANSMISIÓN VISUAL ONLINE</div>
            <h3>CHACALÓN VIRTUAL</h3>
            <p>Homenaje interactivo · música chicha · arcade</p>
          </div>
        </div>

        <div className="chacalon-chat">
          <div className="chacalon-chat__messages" aria-live="polite">
            {messages.map((message) => (
              <div
                className={`chacalon-message chacalon-message--${message.role}`}
                key={message.id}
              >
                <div className="chacalon-message__label">
                  {message.role === "user"
                    ? playerName || message.playerName || "PLAYER"
                    : "CHACALÓN VIRTUAL"}
                </div>
                <p>{message.text}</p>
                {message.fallback && (
                  <small className="chacalon-message__fallback">MODO LOCAL</small>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {error && <div className="banner banner-warn">{error}</div>}

          <form className="chacalon-form" onSubmit={sendMessage}>
              <label className="chacalon-form__label" htmlFor="chacalon-message">
                {playerName ? "HABLA CON CHACALÓN" : "DILE TU NOMBRE A CHACALÓN"}
              </label>
              <textarea
                id="chacalon-message"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={playerName ? "Escribe un mensaje..." : "Escribe tu nombre..."}
                rows={3}
                maxLength={1200}
                disabled={status === "CONNECTING"}
              />
              <div className="chacalon-form__footer">
                <span className="muted">{input.length}/1200</span>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={!input.trim() || status === "CONNECTING"}
                >
                  {status === "CONNECTING" ? "TRANSMITIENDO..." : "ENVIAR"}
                </button>
              </div>
          </form>
        </div>
      </div>
    </GameShell>
  );
}

export { extractRequestedName, getFallbackReply, shouldUseDailyContext, toApiHistory };
