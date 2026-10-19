"use strict";

/* ===================== KONFIGURASI ===================== */
const PW = 440, PH = 330;          // ukuran satu foto di strip
const PAD = 44, GAP = 26, HEAD = 100, FOOT = 124;

const LAYOUTS = {
  strip4: { cols: 1, rows: 4 },
  strip3: { cols: 1, rows: 3 },
  grid4:  { cols: 2, rows: 2 },
  grid6:  { cols: 2, rows: 3 },
};

const FILTERS = {
  normal:  { label: "Normal",  css: "none" },
  bw:      { label: "Hitam Putih", css: "grayscale(1) contrast(1.1)" },
  sepia:   { label: "Sepia",   css: "sepia(.8) contrast(1.05)" },
  vivid:   { label: "Vivid",   css: "saturate(1.6) contrast(1.1)" },
  vintage: { label: "Vintage", css: "sepia(.35) saturate(1.3) hue-rotate(-10deg) contrast(.95) brightness(1.05)" },
  cool:    { label: "Cool",    css: "saturate(1.2) hue-rotate(15deg) brightness(1.03)" },
};

/* ---------- Helper gambar ---------- */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ===================== 5 TEMA ===================== */
const THEMES = {
  classic: {
    name: "Classic Film", emoji: "🎞️", colors: ["#141414", "#f5f5f5", "#e8d9a0"],
    title: "PHOTO BOOTH", font: '"Special Elite", monospace', text: "#f5f5f5",
    stickers: ["⭐", "🎬", "✨", "📽️"], defaultFilter: "bw",
    bg(ctx, W, H) {
      ctx.fillStyle = "#141414"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f2efe6";
      for (let y = 18; y < H - 10; y += 38) {
        rr(ctx, 12, y, 16, 22, 4); ctx.fill();
        rr(ctx, W - 28, y, 16, 22, 4); ctx.fill();
      }
    },
    frame(ctx, x, y, w, h) { ctx.fillStyle = "#f5f5f5"; ctx.fillRect(x - 6, y - 6, w + 12, h + 12); },
    clip(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); },
  },
  kawaii: {
    name: "Kawaii Pop", emoji: "🎀", colors: ["#ffd9ea", "#ff5fa2", "#b58cff"],
    title: "Kawaii Booth ♡", font: '"Pacifico", cursive', text: "#ff4f8b",
    stickers: ["💖", "🎀", "🌸", "⭐", "🍓", "🐰"], defaultFilter: "vivid",
    bg(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#ffd1e6"); g.addColorStop(1, "#dcc8ff");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,.65)";
      for (let y = 14; y < H; y += 34) for (let x = (y / 34) % 2 ? 14 : 31; x < W; x += 34) {
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
    },
    frame(ctx, x, y, w, h) {
      ctx.save(); ctx.shadowColor = "rgba(255,95,162,.45)"; ctx.shadowBlur = 14;
      ctx.fillStyle = "#fff"; rr(ctx, x - 9, y - 9, w + 18, h + 18, 26); ctx.fill(); ctx.restore();
      ctx.lineWidth = 3; ctx.strokeStyle = "#ff8ec0"; rr(ctx, x - 9, y - 9, w + 18, h + 18, 26); ctx.stroke();
    },
    clip(ctx, x, y, w, h) { rr(ctx, x, y, w, h, 18); },
  },
  retro: {
    name: "Retro Polaroid", emoji: "📼", colors: ["#f4e8d0", "#e07a3f", "#2a9d8f"],
    title: "Retro Snap", font: '"Special Elite", monospace', text: "#4a3324",
    stickers: ["☀️", "🌈", "📻", "🕹️", "✌️"], defaultFilter: "vintage",
    bg(ctx, W, H) {
      ctx.fillStyle = "#f4e8d0"; ctx.fillRect(0, 0, W, H);
      const cs = ["#e07a3f", "#f2b134", "#2a9d8f"];
      cs.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * 8, W, 8); ctx.fillRect(0, H - 24 + i * 8, W, 8); });
      // grain
      const r = mulberry32(7);
      ctx.fillStyle = "rgba(90,60,30,.06)";
      for (let i = 0; i < 900; i++) ctx.fillRect(r() * W, r() * H, 2, 2);
    },
    frame(ctx, x, y, w, h) {
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#fffdf6"; ctx.fillRect(x - 12, y - 12, w + 24, h + 24); ctx.restore();
    },
    clip(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); },
  },
  neon: {
    name: "Neon Night", emoji: "🌃", colors: ["#0a0618", "#ff3df2", "#25f4ee"],
    title: "NEON NIGHTS", font: '"Orbitron", sans-serif', text: "#7df9ff",
    stickers: ["⚡", "💜", "🎧", "🪩", "✨"], defaultFilter: "cool",
    bg(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0a0618"); g.addColorStop(1, "#24095c");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(37,244,238,.14)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    },
    frame(ctx, x, y, w, h) {
      ctx.save(); ctx.lineWidth = 4;
      ctx.shadowBlur = 22; ctx.shadowColor = "#ff3df2"; ctx.strokeStyle = "#ff3df2";
      ctx.strokeRect(x - 8, y - 8, w + 16, h + 16);
      ctx.shadowColor = "#25f4ee"; ctx.strokeStyle = "#25f4ee";
      ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
      ctx.restore();
    },
    clip(ctx, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); },
    glow: true,
  },
  garden: {
    name: "Garden Bloom", emoji: "🌿", colors: ["#b9d8b4", "#3f8a52", "#f0a6b8"],
    title: "Garden Smile", font: '"Playfair Display", serif', text: "#2f5d3a",
    stickers: ["🌸", "🍃", "🌼", "🦋", "🌷", "🐝"], defaultFilter: "normal",
    bg(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#e6f3df"); g.addColorStop(1, "#b5d6ae");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(63,138,82,.35)"; ctx.lineWidth = 3;
      rr(ctx, 14, 14, W - 28, H - 28, 24); ctx.stroke();
    },
    frame(ctx, x, y, w, h) {
      ctx.save(); ctx.shadowColor = "rgba(40,90,50,.35)"; ctx.shadowBlur = 12;
      ctx.fillStyle = "#fffaf0"; rr(ctx, x - 8, y - 8, w + 16, h + 16, 16); ctx.fill(); ctx.restore();
    },
    clip(ctx, x, y, w, h) { rr(ctx, x, y, w, h, 10); },
  },
};

/* ===================== STATE ===================== */
const $ = (id) => document.getElementById(id);
const video = $("video");
const state = {
  theme: "classic",
  filter: "bw",
  stream: null,
  shots: [],
  running: false,
  history: [],
  facing: "user",
};

/* ===================== UI AWAL ===================== */
function buildThemes() {
  const box = $("themes");
  Object.entries(THEMES).forEach(([key, t]) => {
    const b = document.createElement("button");
    b.className = "theme-card" + (key === state.theme ? " active" : "");
    b.dataset.key = key;
    b.innerHTML = `<span class="emo">${t.emoji}</span><span class="nm">${t.name}</span>
      <span class="swatch">${t.colors.map((c) => `<i style="background:${c}"></i>`).join("")}</span>`;
    b.onclick = () => setTheme(key);
    box.appendChild(b);
  });
}
function buildFilters() {
  const box = $("filters");
  Object.entries(FILTERS).forEach(([key, f]) => {
    const b = document.createElement("button");
    b.className = "chip"; b.dataset.key = key; b.textContent = f.label;
    b.onclick = () => setFilter(key);
    box.appendChild(b);
  });
}
function setTheme(key) {
  state.theme = key;
  document.body.dataset.theme = key;
  document.querySelectorAll(".theme-card").forEach((c) => c.classList.toggle("active", c.dataset.key === key));
  $("heroTitle").textContent = "📸 " + THEMES[key].title.replace(" ♡", "");
  setFilter(THEMES[key].defaultFilter);
  toast("Tema: " + THEMES[key].name);
}
function setFilter(key) {
  state.filter = key;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.dataset.key === key));
  video.style.filter = FILTERS[key].css;
  renderResult();
}
function slots() { const l = LAYOUTS[$("layout").value]; return l.cols * l.rows; }
function resetShots() {
  state.shots = Array(slots()).fill(null);
  buildDots(); buildThumbs(); renderResult();
}
function buildDots(active = -1) {
  const d = $("dots"); d.innerHTML = "";
  state.shots.forEach((s, i) => {
    const sp = document.createElement("span");
    if (s) sp.className = "done"; else if (i === active) sp.className = "now";
    d.appendChild(sp);
  });
}
function buildThumbs() {
  const box = $("thumbs"); box.innerHTML = "";
  state.shots.forEach((s, i) => {
    const t = document.createElement("div"); t.className = "thumb";
    if (s) {
      const c = document.createElement("canvas"); c.width = 200; c.height = 150;
      c.getContext("2d").drawImage(s, 0, 0, 200, 150); t.appendChild(c);
      const b = document.createElement("button"); b.textContent = "Ulang";
      b.onclick = () => retake(i); t.appendChild(b);
    } else t.innerHTML = `<div class="empty">${i + 1}</div>`;
    box.appendChild(t);
  });
}

/* ===================== KAMERA ===================== */
async function startCamera() {
  if (state.stream) return true;
  if (!navigator.mediaDevices?.getUserMedia) {
    $("camMsgText").textContent = "Browser tidak mendukung kamera. Gunakan tombol \"Dari Galeri\".";
    return false;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: state.facing }, audio: false,
    });
    video.srcObject = state.stream;
    await video.play();
    $("camMsg").classList.add("hidden");
    return true;
  } catch (e) {
    $("camMsgText").textContent = "Akses kamera ditolak / tidak tersedia. Izinkan kamera di browser atau pakai \"Dari Galeri\".";
    $("camMsg").classList.remove("hidden");
    return false;
  }
}

function captureFrame() {
  const c = document.createElement("canvas"); c.width = PW * 2; c.height = PH * 2;
  const ctx = c.getContext("2d");
  const vw = video.videoWidth, vh = video.videoHeight, target = c.width / c.height;
  let sw = vw, sh = vh, sx = 0, sy = 0;
  if (vw / vh > target) { sw = vh * target; sx = (vw - sw) / 2; } else { sh = vw / target; sy = (vh - sh) / 2; }
  ctx.save();
  if ($("optMirror").checked) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.filter = FILTERS[state.filter].css;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, c.width, c.height);
  ctx.restore();
  return c;
}

/* ===================== SUARA & EFEK ===================== */
let audioCtx;
function beep(freq = 660, dur = 0.12, type = "sine", vol = 0.15) {
  if (!$("optSound").checked) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (_) {}
}
function shutter() { beep(1200, 0.05, "square", 0.1); setTimeout(() => beep(400, 0.12, "square", 0.1), 60); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function countdown(sec) {
  const el = $("count");
  for (let i = sec; i >= 1; i--) {
    el.textContent = i; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
    beep(i === 1 ? 880 : 600);
    await sleep(1000);
  }
  el.textContent = "";
}
function doFlash() {
  const f = $("flash"); f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); shutter();
}
function confetti() {
  const list = THEMES[state.theme].stickers;
  for (let i = 0; i < 38; i++) {
    const s = document.createElement("span"); s.className = "confetti";
    s.textContent = list[i % list.length];
    s.style.left = Math.random() * 100 + "vw";
    s.style.fontSize = 18 + Math.random() * 22 + "px";
    s.style.animationDuration = 2.2 + Math.random() * 2 + "s";
    s.style.animationDelay = Math.random() * 0.6 + "s";
    document.body.appendChild(s); setTimeout(() => s.remove(), 5200);
  }
}
let toastT;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ===================== ALUR SESI ===================== */
function setBusy(b) {
  state.running = b;
  $("btnStart").disabled = b; $("btnReset").disabled = b;
  $("layout").disabled = b;
}

async function startSession() {
  if (state.running) return;
  if (!(await startCamera())) return;
  setBusy(true);
  state.shots = Array(slots()).fill(null);
  buildThumbs(); renderResult();
  const sec = +$("timer").value;
  for (let i = 0; i < state.shots.length; i++) {
    buildDots(i);
    await countdown(sec);
    doFlash();
    state.shots[i] = captureFrame();
    buildDots(i + 1 < state.shots.length ? i + 1 : -1);
    buildThumbs(); renderResult();
    await sleep(900);
  }
  setBusy(false);
  finishSession();
}

async function retake(i) {
  if (state.running) return;
  if (!(await startCamera())) return;
  setBusy(true);
  buildDots(i);
  await countdown(+$("timer").value);
  doFlash();
  state.shots[i] = captureFrame();
  buildDots(); buildThumbs(); renderResult();
  setBusy(false);
  saveHistory();
}

function finishSession() {
  confetti(); toast("Selesai! 🎉");
  saveHistory();
  $("resultSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Foto dari galeri */
function loadFromFiles(files) {
  const imgs = [...files].filter((f) => f.type.startsWith("image/")).slice(0, slots());
  if (!imgs.length) return;
  state.shots = Array(slots()).fill(null);
  Promise.all(imgs.map((f) => new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement("canvas"); c.width = PW * 2; c.height = PH * 2;
      const ctx = c.getContext("2d"), target = c.width / c.height;
      let sw = im.width, sh = im.height, sx = 0, sy = 0;
      if (im.width / im.height > target) { sw = im.height * target; sx = (im.width - sw) / 2; } else { sh = im.width / target; sy = (im.height - sh) / 2; }
      ctx.filter = FILTERS[state.filter].css;
      ctx.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
      URL.revokeObjectURL(im.src); res(c);
    };
    im.src = URL.createObjectURL(f);
  }))).then((cs) => {
    cs.forEach((c, i) => (state.shots[i] = c));
    buildDots(); buildThumbs(); renderResult(); saveHistory();
    toast(cs.length + " foto dimuat");
  });
}

/* ===================== RENDER STRIP ===================== */
function renderResult() {
  const cv = $("resultCanvas"), ctx = cv.getContext("2d");
  const L = LAYOUTS[$("layout").value], T = THEMES[state.theme];
  const W = PAD * 2 + L.cols * PW + (L.cols - 1) * GAP;
  const H = HEAD + L.rows * PH + (L.rows - 1) * GAP + FOOT + PAD / 2;
  cv.width = W; cv.height = H;

  T.bg(ctx, W, H);

  // Judul
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = T.text; ctx.font = `34px ${T.font}`;
  if (T.glow) { ctx.shadowColor = "#25f4ee"; ctx.shadowBlur = 16; }
  ctx.fillText(T.title, W / 2, HEAD / 2 + 6);
  ctx.shadowBlur = 0;

  // Foto
  const pos = [];
  for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
    const x = PAD + c * (PW + GAP), y = HEAD + r * (PH + GAP);
    pos.push([x, y]);
    T.frame(ctx, x, y, PW, PH);
    ctx.save();
    T.clip(ctx, x, y, PW, PH); ctx.clip();
    const s = state.shots[r * L.cols + c];
    if (s) ctx.drawImage(s, x, y, PW, PH);
    else {
      ctx.fillStyle = "rgba(128,128,128,.25)"; ctx.fillRect(x, y, PW, PH);
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.font = "54px sans-serif"; ctx.fillText("📷", x + PW / 2, y + PH / 2);
    }
    ctx.restore();
  }

  // Stiker (posisi acak tetap per tema)
  if ($("optStickers").checked) {
    const rnd = mulberry32(state.theme.length * 97 + L.rows * 13 + L.cols);
    const n = 8 + L.rows * 2;
    for (let i = 0; i < n; i++) {
      const e = T.stickers[Math.floor(rnd() * T.stickers.length)];
      let x, y;
      const zone = rnd();
      if (zone < 0.3) { x = rnd() * W; y = 10 + rnd() * (HEAD - 20); }
      else if (zone < 0.6) { x = rnd() * W; y = H - FOOT + rnd() * (FOOT - 20); }
      else { const p = pos[Math.floor(rnd() * pos.length)]; x = p[0] + (rnd() < .5 ? 6 : PW - 6); y = p[1] + (rnd() < .5 ? 6 : PH - 6); }
      ctx.save(); ctx.translate(x, y); ctx.rotate((rnd() - 0.5) * 0.9);
      ctx.font = `${30 + rnd() * 22}px serif`; ctx.fillStyle = "#000"; ctx.fillText(e, 0, 0); ctx.restore();
    }
  }

  // Caption & tanggal
  const cap = $("caption").value.trim();
  ctx.fillStyle = T.text; ctx.textAlign = "center";
  if (T.glow) { ctx.shadowColor = "#ff3df2"; ctx.shadowBlur = 12; }
  if (cap) { ctx.font = `26px ${T.font}`; ctx.fillText(cap, W / 2, H - FOOT / 2 - 6); }
  if ($("optDate").checked) {
    ctx.font = `15px ${T.font}`; ctx.globalAlpha = 0.85;
    ctx.fillText(new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
      W / 2, H - (cap ? 40 : FOOT / 2 - 4));
    ctx.globalAlpha = 1;
  }
  ctx.shadowBlur = 0;
}

/* ===================== AKSI HASIL ===================== */
function allEmpty() { return state.shots.every((s) => !s); }
function download() {
  if (allEmpty()) return toast("Ambil foto dulu ya 📸");
  $("resultCanvas").toBlob((b) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `snapbooth-${state.theme}-${Date.now()}.png`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Tersimpan ⬇");
  }, "image/png");
}
function share() {
  if (allEmpty()) return toast("Ambil foto dulu ya 📸");
  $("resultCanvas").toBlob(async (b) => {
    const file = new File([b], "snapbooth.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Foto SnapBooth-ku" }); } catch (_) {}
    } else if (navigator.clipboard && window.ClipboardItem) {
      try { await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]); toast("Gambar disalin ke clipboard 📋"); }
      catch (_) { toast("Browser tidak mendukung berbagi, silakan unduh."); }
    } else toast("Browser tidak mendukung berbagi, silakan unduh.");
  });
}
function saveHistory() {
  if (allEmpty()) return;
  const url = $("resultCanvas").toDataURL("image/jpeg", 0.7);
  state.history.unshift(url); state.history = state.history.slice(0, 6);
  const box = $("history"); box.innerHTML = "";
  state.history.forEach((u) => {
    const im = new Image(); im.src = u; im.title = "Klik untuk membuka";
    im.onclick = () => window.open(u, "_blank");
    box.appendChild(im);
  });
}

/* ===================== EVENT ===================== */
$("btnCam").onclick = startCamera;
$("btnFlip").onclick = async () => {
  if (state.running) return;
  state.facing = state.facing === "user" ? "environment" : "user";
  if (state.stream) { state.stream.getTracks().forEach((t) => t.stop()); state.stream = null; }
  $("optMirror").checked = state.facing === "user";   // kamera belakang tidak perlu dicerminkan
  video.classList.toggle("mirror", $("optMirror").checked);
  await startCamera();
};
$("btnStart").onclick = startSession;
$("btnReset").onclick = () => { resetShots(); toast("Direset"); };
$("btnDownload").onclick = download;
$("btnPrint").onclick = () => (allEmpty() ? toast("Ambil foto dulu ya 📸") : window.print());
$("btnShare").onclick = share;
$("fileInput").onchange = (e) => { loadFromFiles(e.target.files); e.target.value = ""; };
$("layout").onchange = resetShots;
$("caption").oninput = renderResult;
["optStickers", "optDate"].forEach((id) => ($(id).onchange = renderResult));
$("optMirror").onchange = () => video.classList.toggle("mirror", $("optMirror").checked);
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(document.activeElement.tagName)) {
    e.preventDefault(); startSession();
  }
});

/* ===================== INIT ===================== */
buildThemes(); buildFilters();
video.classList.add("mirror");
setFilter(THEMES[state.theme].defaultFilter);
resetShots();
if (document.fonts?.ready) document.fonts.ready.then(renderResult);