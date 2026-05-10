import { useState, useEffect, useRef } from "react";

const QUOTES = [
  "real is rare, you are magic ✨",
  "small progress is still progress 💜",
  "where focus goes, energy flows 🌸",
  "go at your own pace, always 🕊️",
  "be proud of how far you've come 🌷",
  "you deserve all the good things 💫",
  "bloom where you are planted 🌸",
  "peace is always the answer 🤍",
  "choose yourself, every single day 💜",
  "soft life, sweet soul 🎀",
  "your vibe is your superpower ✨",
  "rest is productive too 🕯️",
];

const MOODS = [
  { label: "grateful", emoji: "🌷" },
  { label: "peaceful", emoji: "🕊️" },
  { label: "motivated", emoji: "⚡" },
  { label: "in my flow", emoji: "🌊" },
  { label: "happy", emoji: "🌸" },
  { label: "creative", emoji: "🎨" },
  { label: "tired", emoji: "🌙" },
];

const DEFAULT_TODOS = [
  { id: 1, text: "morning stretch", done: false },
  { id: 2, text: "plan my day", done: false },
  { id: 3, text: "drink water", done: false },
  { id: 4, text: "focus on goals", done: false },
  { id: 5, text: "learn something new", done: false },
  { id: 6, text: "be proud of yourself", done: false },
];

const W_ICONS = {
  Clear: "☀️", Clouds: "☁️", Rain: "🌧️",
  Snow: "❄️", Thunderstorm: "⛈️", Drizzle: "🌦️", Mist: "🌫️",
};

const store = {
  get: async (k) => { try { const r = await window.storage.get(k); return r?.value ?? null; } catch { return null; } },
  set: async (k, v) => { try { await window.storage.set(k, v); } catch {} },
};

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function PurpleDashboard() {
  const [time, setTime] = useState(new Date());
  const [name, setName] = useState("[name]");
  const [todos, setTodos] = useState(DEFAULT_TODOS);
  const [newTodo, setNewTodo] = useState("");
  const [moods, setMoods] = useState([]);
  const [journal, setJournal] = useState("");
  const [quote] = useState(QUOTES[new Date().getDate() % QUOTES.length]);
  const [weather, setWeather] = useState(null);
  const [apiKey, setApiKey] = useState("");
  const [tempKey, setTempKey] = useState("");
  const [tempName, setTempName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [curIdx, setCurIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState("home");
  const [loaded, setLoaded] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  const audioRef = useRef(null);
  const fileRef = useRef(null);
  const journalTimer = useRef(null);
  const progressRef = useRef(null);

  // ─── Load persisted data ───────────────────────────────────────────────────
  useEffect(() => {
    // Font
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;1,500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    (async () => {
      const td = await store.get("todos"); if (td) setTodos(JSON.parse(td));
      const md = await store.get("moods"); if (md) setMoods(JSON.parse(md));
      const jd = await store.get("journal"); if (jd) setJournal(jd);
      const nd = await store.get("name"); if (nd) { setName(nd); setTempName(nd); }
      const kd = await store.get("wkey"); if (kd) { setApiKey(kd); setTempKey(kd); }
      setLoaded(true);
    })();
  }, []);

  // ─── Clock ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Weather ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey) return;
    const fetchW = (lat, lon) =>
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`)
        .then(r => r.json())
        .then(d => { if (d.main) setWeather({ temp: Math.round(d.main.temp), desc: d.weather[0].description, city: d.name, icon: d.weather[0].main }); })
        .catch(() => {});
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => fetchW(coords.latitude, coords.longitude),
      () => fetch(`https://api.openweathermap.org/data/2.5/weather?q=Dhaka&appid=${apiKey}&units=metric`).then(r => r.json()).then(d => { if (d.main) setWeather({ temp: Math.round(d.main.temp), desc: d.weather[0].description, city: d.name, icon: d.weather[0].main }); }).catch(() => {})
    );
  }, [apiKey]);

  // ─── Audio ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioRef.current || !playlist[curIdx]) return;
    audioRef.current.src = playlist[curIdx].url;
    if (playing) audioRef.current.play().catch(() => {});
  }, [curIdx, playlist]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playlist.length === 0) { fileRef.current?.click(); return; }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const skip = (d) => { if (!playlist.length) return; setCurIdx(i => (i + d + playlist.length) % playlist.length); };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    const tracks = files.map(f => ({ name: f.name.replace(/\.[^/.]+$/, ""), url: URL.createObjectURL(f) }));
    setPlaylist(p => [...p, ...tracks]);
    if (playlist.length === 0) setCurIdx(0);
  };

  const seekAudio = (e) => {
    if (!progressRef.current || !audioRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
  };

  // ─── Todos ────────────────────────────────────────────────────────────────
  const addTodo = () => {
    if (!newTodo.trim()) return;
    const upd = [...todos, { id: Date.now(), text: newTodo.trim(), done: false }];
    setTodos(upd); setNewTodo(""); store.set("todos", JSON.stringify(upd));
  };
  const toggleTodo = (id) => { const upd = todos.map(t => t.id === id ? { ...t, done: !t.done } : t); setTodos(upd); store.set("todos", JSON.stringify(upd)); };
  const delTodo = (id) => { const upd = todos.filter(t => t.id !== id); setTodos(upd); store.set("todos", JSON.stringify(upd)); };

  // ─── Mood ─────────────────────────────────────────────────────────────────
  const toggleMood = (m) => {
    const upd = moods.includes(m) ? moods.filter(x => x !== m) : [...moods, m];
    setMoods(upd); store.set("moods", JSON.stringify(upd));
  };

  // ─── Journal ──────────────────────────────────────────────────────────────
  const handleJournal = (val) => {
    setJournal(val);
    clearTimeout(journalTimer.current);
    journalTimer.current = setTimeout(() => { store.set("journal", val); setJournalSaved(true); setTimeout(() => setJournalSaved(false), 2000); }, 800);
  };

  // ─── Settings save ────────────────────────────────────────────────────────
  const saveSettings = () => {
    if (tempName.trim()) { setName(tempName.trim()); store.set("name", tempName.trim()); }
    if (tempKey.trim()) { setApiKey(tempKey.trim()); store.set("wkey", tempKey.trim()); }
    setShowSettings(false);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const h = time.getHours();
  const greeting = h < 5 ? "Sweet dreams" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night";
  const timeStr = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const C = {
    bg: "linear-gradient(160deg, #EDE6F8 0%, #DCCFF0 40%, #D0C2EA 100%)",
    card: { background: "rgba(255,255,255,0.58)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.85)", boxShadow: "0 4px 24px rgba(130,90,190,0.08)" },
    purple: "#7B5EA7",
    softPurple: "#B8A3D4",
    text: "#3D2E5C",
    muted: "#9B8BB4",
    accent: "linear-gradient(135deg, #C8A0E8, #7B5EA7)",
    font: "'Nunito', sans-serif",
    display: "'Playfair Display', serif",
  };

  if (!loaded) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: "40px", animation: "pulse 1s infinite" }}>💜</div>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: C.font, color: C.text, paddingBottom: "90px", position: "relative" }}>
      <style>{`
        * { box-sizing: border-box; }
        input:focus, textarea:focus { border-color: #B8A3D4 !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(123,94,167,0.3); border-radius: 4px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sparkle { 0%,100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        .widget { animation: fadeIn 0.5s ease both; }
        .sparkle-1 { animation: sparkle 2s ease infinite; }
        .sparkle-2 { animation: sparkle 2s ease 0.7s infinite; }
        .sparkle-3 { animation: sparkle 2s ease 1.4s infinite; }
        .todo-item:hover .del-btn { opacity: 1; }
        .del-btn { opacity: 0; transition: opacity 0.2s; }
        button { font-family: 'Nunito', sans-serif; }
        input, textarea { font-family: 'Nunito', sans-serif; }
      `}</style>

      <audio
        ref={audioRef}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => skip(1)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={handleFiles} />

      {/* ── Settings Modal ─────────────────────────────────────────────────── */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(60,30,100,0.45)", backdropFilter: "blur(10px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: "28px", padding: "28px", width: "100%", maxWidth: "340px", boxShadow: "0 30px 80px rgba(100,60,160,0.25)" }}>
            <h3 style={{ margin: "0 0 20px", color: C.purple, fontSize: "20px", fontFamily: C.display }}>⚙️ Settings</h3>

            <p style={{ margin: "0 0 6px", fontSize: "12px", color: C.muted, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>Display Name</p>
            <input value={tempName} onChange={e => setTempName(e.target.value)} placeholder="Enter name..."
              style={{ width: "100%", padding: "11px 14px", borderRadius: "14px", border: "2px solid #DDD5EC", outline: "none", fontSize: "14px", marginBottom: "18px", color: C.text, background: "#FAF8FE" }} />

            <p style={{ margin: "0 0 6px", fontSize: "12px", color: C.muted, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>OpenWeatherMap API Key</p>
            <input value={tempKey} onChange={e => setTempKey(e.target.value)} placeholder="Paste API key here..."
              style={{ width: "100%", padding: "11px 14px", borderRadius: "14px", border: "2px solid #DDD5EC", outline: "none", fontSize: "13px", marginBottom: "8px", color: C.text, background: "#FAF8FE" }} />
            <p style={{ margin: "0 0 20px", fontSize: "11px", color: C.muted }}>Free key at openweathermap.org 🌤️</p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setShowSettings(false)} style={{ flex: 1, padding: "12px", borderRadius: "14px", border: "2px solid #DDD5EC", background: "transparent", color: C.muted, cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>Cancel</button>
              <button onClick={saveSettings} style={{ flex: 1, padding: "12px", borderRadius: "14px", border: "none", background: C.accent, color: "white", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}>Save 💜</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: "430px", margin: "0 auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Header */}
        <div className="widget" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px", animationDelay: "0s" }}>
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: C.muted, fontWeight: 500 }}>{greeting} ✨</p>
            <h1 style={{ margin: "2px 0 0", fontSize: "26px", fontWeight: 800, color: C.text, fontFamily: C.display, fontStyle: "italic" }}>{name} 💜</h1>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: C.softPurple }}>{dateStr}</p>
          </div>
          <button onClick={() => { setTempKey(apiKey); setTempName(name); setShowSettings(true); }}
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: "50%", width: "42px", height: "42px", cursor: "pointer", fontSize: "18px", boxShadow: "0 2px 12px rgba(130,90,190,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>⚙️</button>
        </div>

        {/* Row 1: Music + Quote */}
        <div className="widget" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: "12px", animationDelay: "0.05s" }}>
          {/* Music Player */}
          <div style={{ ...C.card, padding: "16px" }}>
            <div style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "center" }}>
              <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0, boxShadow: "0 4px 14px rgba(123,94,167,0.35)" }}>🎵</div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {playlist[curIdx]?.name || "add songs ♪"}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "11px", color: C.muted }}>{playlist.length > 0 ? `${playlist.length} song${playlist.length > 1 ? "s" : ""}` : "tap + below"}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div ref={progressRef} onClick={seekAudio} style={{ height: "4px", background: "#EDE6F8", borderRadius: "4px", marginBottom: "6px", cursor: "pointer", position: "relative" }}>
              <div style={{ height: "100%", width: `${duration ? (progress / duration) * 100 : 0}%`, background: C.accent, borderRadius: "4px", transition: "width 0.5s linear", position: "relative" }}>
                <div style={{ position: "absolute", right: "-4px", top: "-4px", width: "12px", height: "12px", borderRadius: "50%", background: C.purple, boxShadow: "0 0 0 2px white" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: C.muted, marginBottom: "12px" }}>
              <span>{fmt(progress)}</span><span>{fmt(duration)}</span>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => fileRef.current?.click()} title="Add music" style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: C.softPurple }}>➕</button>
              <button onClick={() => skip(-1)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: C.purple }}>⏮</button>
              <button onClick={togglePlay} style={{ width: "42px", height: "42px", borderRadius: "50%", background: C.accent, border: "none", fontSize: "18px", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(123,94,167,0.4)" }}>
                {playing ? "⏸" : "▶"}
              </button>
              <button onClick={() => skip(1)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: C.purple }}>⏭</button>
              <button style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: C.softPurple }}>🔀</button>
            </div>
          </div>

          {/* Quote + Bow */}
          <div style={{ ...C.card, padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "rgba(220,205,245,0.5)" }}>
            <div className="sparkle-1" style={{ fontSize: "10px", color: C.softPurple, marginBottom: "4px" }}>✦</div>
            <div style={{ fontSize: "30px", marginBottom: "8px" }}>🎀</div>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: C.text, lineHeight: 1.45, fontFamily: C.display, fontStyle: "italic" }}>real is rare</p>
            <p style={{ margin: "2px 0", fontSize: "13px", fontWeight: 700, color: C.purple, fontFamily: C.display }}>you are magic</p>
            <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
              <span className="sparkle-1" style={{ fontSize: "10px", color: C.softPurple }}>✦</span>
              <span className="sparkle-2" style={{ fontSize: "10px", color: C.softPurple }}>✦</span>
              <span className="sparkle-3" style={{ fontSize: "10px", color: C.softPurple }}>✦</span>
            </div>
          </div>
        </div>

        {/* Row 2: Clock + Weather + Aesthetic */}
        <div className="widget" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px", animationDelay: "0.1s" }}>
          {/* Clock */}
          <div style={{ ...C.card, padding: "20px", textAlign: "center" }}>
            <p style={{ margin: "0 0 2px", fontSize: "38px", fontWeight: 800, color: C.text, letterSpacing: "-2px", fontFamily: C.display }}>
              {timeStr} <span style={{ fontSize: "20px" }}>💜</span>
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: C.muted }}>make a wish ✨</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px", fontSize: "22px" }}>
              <span className="sparkle-1">⭐</span>
              <span className="sparkle-2">🎀</span>
              <span className="sparkle-3">⭐</span>
            </div>
          </div>

          {/* Weather */}
          <div style={{ ...C.card, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            {weather ? (
              <>
                <span style={{ fontSize: "34px", display: "block" }}>{W_ICONS[weather.icon] || "🌤️"}</span>
                <p style={{ margin: "6px 0 2px", fontSize: "34px", fontWeight: 800, color: C.text, lineHeight: 1, fontFamily: C.display }}>{weather.temp}°</p>
                <p style={{ margin: 0, fontSize: "11px", color: C.muted, textTransform: "capitalize" }}>{weather.desc}</p>
                <p style={{ margin: "4px 0 0", fontSize: "10px", color: C.softPurple }}>{weather.city} 💜</p>
              </>
            ) : (
              <>
                <span style={{ fontSize: "34px" }}>🌤️</span>
                <p style={{ margin: "8px 0 0", fontSize: "11px", color: C.muted }}>
                  {apiKey ? "loading..." : "add key in settings"}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Row 3: To-do List */}
        <div className="widget" style={{ ...C.card, padding: "18px", animationDelay: "0.15s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: C.text, fontFamily: C.display }}>to do list</h3>
            <span style={{ color: C.softPurple, fontSize: "18px", letterSpacing: "2px" }}>···</span>
          </div>
          <div style={{ maxHeight: "220px", overflowY: "auto" }}>
            {todos.map(t => (
              <div key={t.id} className="todo-item" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "11px" }}>
                <button onClick={() => toggleTodo(t.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", padding: 0, flexShrink: 0, lineHeight: 1 }}>
                  {t.done ? "💜" : "🤍"}
                </button>
                <span style={{ flex: 1, fontSize: "13px", color: t.done ? C.softPurple : C.text, textDecoration: t.done ? "line-through" : "none", transition: "all 0.2s" }}>{t.text}</span>
                <button className="del-btn" onClick={() => delTodo(t.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#C8B4E3", padding: "0 2px" }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <input value={newTodo} onChange={e => setNewTodo(e.target.value)} onKeyDown={e => e.key === "Enter" && addTodo()}
              placeholder="add a task... 💜"
              style={{ flex: 1, padding: "10px 14px", borderRadius: "14px", border: "1.5px solid #DDD5EC", outline: "none", fontSize: "13px", background: "rgba(255,255,255,0.7)", color: C.text }} />
            <button onClick={addTodo} style={{ padding: "10px 16px", borderRadius: "14px", border: "none", background: C.accent, color: "white", cursor: "pointer", fontSize: "18px", boxShadow: "0 4px 14px rgba(123,94,167,0.35)" }}>+</button>
          </div>
        </div>

        {/* Row 4: Break + Mood */}
        <div className="widget" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "12px", animationDelay: "0.2s" }}>
          {/* Break */}
          <div style={{ ...C.card, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "rgba(220,205,245,0.4)" }}>
            <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>🕯️</span>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: C.text }}>take a break</p>
            <p style={{ margin: "5px 0 0", fontSize: "12px", color: C.muted }}>you deserve it 💜</p>
          </div>

          {/* Mood Tracker */}
          <div style={{ ...C.card, padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: C.text }}>current mood</h3>
              <span style={{ color: C.softPurple, letterSpacing: "2px" }}>···</span>
            </div>
            {MOODS.map(({ label, emoji }) => (
              <div key={label} onClick={() => toggleMood(label)}
                style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "7px", cursor: "pointer", padding: "2px 4px", borderRadius: "8px", transition: "background 0.2s", background: moods.includes(label) ? "rgba(180,150,220,0.2)" : "transparent" }}>
                <span style={{ fontSize: "13px" }}>{moods.includes(label) ? "💜" : "🤍"}</span>
                <span style={{ fontSize: "11px", color: moods.includes(label) ? C.purple : C.muted, fontWeight: moods.includes(label) ? 700 : 500 }}>{label}</span>
                <span style={{ marginLeft: "auto", fontSize: "12px" }}>{emoji}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 5: Daily Quote Banner */}
        <div className="widget" style={{ ...C.card, padding: "22px 24px", textAlign: "center", background: "rgba(210,190,240,0.4)", animationDelay: "0.25s" }}>
          <span style={{ fontSize: "22px", color: C.softPurple, display: "block", lineHeight: 1, marginBottom: "10px", fontFamily: C.display }}>"</span>
          <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: C.text, fontFamily: C.display, fontStyle: "italic", lineHeight: 1.5 }}>{quote}</p>
          <span style={{ fontSize: "22px", color: C.softPurple, display: "block", lineHeight: 1, marginTop: "10px", fontFamily: C.display }}>"</span>
        </div>

        {/* Row 6: Focus card */}
        <div className="widget" style={{ ...C.card, padding: "20px", textAlign: "center", animationDelay: "0.3s" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", fontSize: "26px", marginBottom: "12px" }}>
            <span className="sparkle-1">🕊️</span>
            <span className="sparkle-2">✨</span>
            <span className="sparkle-3">🌸</span>
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: C.muted, fontWeight: 600 }}>where focus goes</p>
          <p style={{ margin: "4px 0 0", fontSize: "17px", fontWeight: 800, color: C.purple, fontFamily: C.display, fontStyle: "italic" }}>energy flows</p>
          <p style={{ margin: "10px 0 0", fontSize: "12px", color: C.softPurple }}>💜 one step at a time</p>
        </div>

        {/* Row 7: Journal */}
        <div className="widget" style={{ ...C.card, padding: "18px", animationDelay: "0.35s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: C.text, fontFamily: C.display }}>📔 my journal</h3>
            <span style={{ fontSize: "11px", color: journalSaved ? C.purple : C.softPurple, transition: "color 0.3s" }}>
              {journalSaved ? "saved 💜" : "auto save"}
            </span>
          </div>
          <textarea value={journal} onChange={e => handleJournal(e.target.value)}
            placeholder={`write your thoughts here, ${name}... 💜\n\nthis space is just for you.`}
            style={{ width: "100%", minHeight: "140px", padding: "14px", borderRadius: "16px", border: "1.5px solid #DDD5EC", outline: "none", fontSize: "13px", background: "rgba(255,255,255,0.65)", color: C.text, resize: "vertical", lineHeight: 1.65, display: "block" }} />
        </div>

        {/* Row 8: Encouragement cards */}
        <div className="widget" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", animationDelay: "0.4s" }}>
          <div style={{ ...C.card, padding: "20px", textAlign: "center", background: "rgba(200,180,235,0.4)" }}>
            <span style={{ fontSize: "28px" }}>🌷</span>
            <p style={{ margin: "10px 0 0", fontSize: "13px", fontWeight: 700, color: C.text, lineHeight: 1.4 }}>go at your own pace</p>
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: C.muted }}>no rush, no pressure</p>
          </div>
          <div style={{ ...C.card, padding: "20px", textAlign: "center", background: "rgba(220,205,245,0.4)" }}>
            <span style={{ fontSize: "28px" }}>🌙</span>
            <p style={{ margin: "10px 0 0", fontSize: "13px", fontWeight: 700, color: C.text, lineHeight: 1.4 }}>rest is part of the process</p>
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: C.muted }}>be gentle with yourself</p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "8px 0", color: C.softPurple, fontSize: "12px" }}>
          made with 💜 just for you
        </div>

      </div>

      {/* ── Bottom Navigation ──────────────────────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(235,225,255,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.9)", display: "flex", justifyContent: "space-around", alignItems: "center", padding: "10px 0 14px", zIndex: 100, boxShadow: "0 -4px 30px rgba(120,80,180,0.12)" }}>
        {[
          { icon: "💜", tab: "home" },
          { icon: "💬", tab: "chat" },
          { icon: "🎀", tab: "bow" },
          { icon: "⭐", tab: "star" },
          { icon: "🎵", tab: "music" },
        ].map(({ icon, tab: t }) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", opacity: tab === t ? 1 : 0.45, transform: tab === t ? "scale(1.2)" : "scale(1)", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "40px" }}>
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
