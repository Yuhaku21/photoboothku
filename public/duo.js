"use strict";

/* =====================================================================
 * SnapBooth Duo – foto berdua secara online (2 orang, 2 perangkat)
 *
 * Cara kerja:
 *  - Host membuat ruangan → mendapat link undangan (?room=KODE).
 *  - Teman membuka link → bergabung. Video saling terhubung langsung
 *    (WebRTC, peer-to-peer) lewat PeerJS. PeerJS cloud hanya dipakai
 *    untuk "perkenalan" kedua perangkat (signaling).
 *  - Host mengatur semuanya (tema, layout, mulai foto). Setiap jepretan
 *    menggabungkan kamera host (kiri) + kamera teman (kanan), lalu hasilnya
 *    dikirim ke teman sehingga kedua orang punya strip yang sama.
 * ===================================================================== */
(() => {
  const PREFIX = "snapbooth-";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // tanpa karakter yang mirip (0/O, 1/I)

  // Server STUN/TURN. STUN cukup untuk kebanyakan jaringan. TURN diperlukan bila
  // salah satu pihak berada di jaringan yang ketat (mis. sebagian data seluler/kantor).
  // TURN publik di bawah ini gratis tapi bersifat "seadanya" – untuk penggunaan serius,
  // ganti dengan TURN milikmu sendiri (mis. Metered, Cloudflare Calls, Twilio).
  const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  const net = { peer: null, conn: null, call: null, role: null, code: null };
  let mode = "solo";
  let incomingShots = Promise.resolve();
  let inviteCode = (new URLSearchParams(location.search).get("room") || "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || null;

  const wrap = $("cameraWrap");
  const remoteVideo = $("remoteVideo");
  const card = $("roomCard");
  const views = { idle: $("roomIdle"), host: $("roomHost"), guest: $("roomGuest") };
  const statusEl = $("roomStatus");
  const after = (fn) => setTimeout(fn, 0);

  /* ------------------------- UI helpers ------------------------- */
  function setStatus(text, kind = "info") {
    statusEl.textContent = text || "";
    statusEl.dataset.kind = kind;
    statusEl.hidden = !text;
  }

  function showView(name) {
    Object.entries(views).forEach(([k, v]) => (v.hidden = k !== name));
    $("btnJoin").hidden = !!net.role;
    $("btnOwnRoom").hidden = !!net.role;
    $("btnLeave").hidden = !net.role;
    $("guestCode").textContent = inviteCode || "";
  }

  function lockControls(lock) {   // tamu tidak boleh mengubah pengaturan (host yang mengatur)
    document.querySelectorAll(".settings select, .settings input, .theme-card, .chip, #btnStart, #btnReset, #fileInput")
      .forEach((e) => (e.disabled = lock));
    const lbl = document.querySelector('label[for="fileInput"]');
    if (lbl) lbl.classList.toggle("is-disabled", lock);
  }

  function setRoleLayout(role) {
    wrap.classList.toggle("online", !!role);
    wrap.classList.toggle("host", role === "host");
    wrap.classList.toggle("guest", role === "guest");
    document.body.classList.toggle("is-guest", role === "guest");
    document.body.classList.remove("guest-results");
    $("btnReady").hidden = role !== "guest";
    $("btnReady").disabled = false;
    $("btnReady").textContent = "✅ Saya Siap";
    const tl = $("tagLocal"), tr = $("tagRemote");
    tl.hidden = tr.hidden = !role;
    tl.style.left = role === "host" ? "8px" : "auto"; tl.style.right = role === "guest" ? "8px" : "auto";
    tr.style.left = role === "guest" ? "8px" : "auto"; tr.style.right = role === "host" ? "8px" : "auto";
    $("waiting").hidden = !role || !!remoteVideo.srcObject;
    lockControls(role === "guest");
  }

  function syncMirror() { remoteVideo.classList.toggle("mirror", $("optMirror").checked); }

  function inviteLink() { return `${location.origin}${location.pathname}?room=${net.code}`; }

  /* ------------------------- Mode Solo / Berdua ------------------------- */
  document.querySelectorAll("#modeSwitch .seg").forEach((b) => (b.onclick = () => setMode(b.dataset.mode)));

  function setMode(m) {
    mode = m;
    document.querySelectorAll("#modeSwitch .seg").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
    card.hidden = m !== "duo";
    if (m === "solo") {
      if (net.role) leaveRoom(true);
      setStatus("");
    } else if (!net.role) {
      showView(inviteCode ? "guest" : "idle");
    }
  }

  /* ------------------------- Host: buat ruangan ------------------------- */
  $("btnCreate").onclick = createRoom;

  async function createRoom() {
    if (!window.Peer) return setStatus("Library koneksi (PeerJS) gagal dimuat. Periksa internet lalu muat ulang halaman.", "error");
    if (!(await startCamera())) return setStatus("Izinkan akses kamera dulu untuk membuat ruangan.", "error");
    net.role = "host";
    setRoleLayout("host");
    showView("host");
    setStatus("Membuat ruangan…");
    openHostPeer(0);
  }

  function openHostPeer(attempt) {
    const code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
    const peer = new Peer(PREFIX + code, { config: { iceServers: ICE_SERVERS } });
    net.peer = peer;
    peer.on("open", () => {
      net.code = code;
      const link = inviteLink();
      $("roomCode").textContent = code;
      $("roomLink").value = link;
      $("btnWa").href = "https://wa.me/?text=" + encodeURIComponent("Yuk foto bareng di SnapBooth! Gabung ke sini: " + link);
      setStatus("Menunggu temanmu bergabung… kirim link di atas.");
    });
    peer.on("connection", onGuestConnection);
    peer.on("call", onCall);
    peer.on("disconnected", () => { try { peer.reconnect(); } catch (_) {} });
    peer.on("error", (e) => {
      if (e.type === "unavailable-id" && attempt < 4) {   // kode kebetulan sudah dipakai → buat kode lain
        try { peer.destroy(); } catch (_) {}
        return openHostPeer(attempt + 1);
      }
      netError(e);
    });
  }

  function onGuestConnection(conn) {
    if (net.conn && net.conn.open) {   // ruangan hanya untuk 2 orang
      conn.on("open", () => { conn.send({ t: "full" }); setTimeout(() => conn.close(), 300); });
      return;
    }
    net.conn = conn;
    conn.on("open", () => { setStatus("Temanmu terhubung! 🎉 Menyiapkan video…", "ok"); syncSettings(); });
    conn.on("data", onData);
    conn.on("close", () => onPartnerLeft("Temanmu keluar dari ruangan."));
    conn.on("error", () => onPartnerLeft("Koneksi dengan temanmu terputus."));
  }

  function onCall(call) {
    net.call = call;
    call.answer(state.stream);
    call.on("stream", attachRemote);
    call.on("close", () => onPartnerLeft("Temanmu keluar dari ruangan."));
    watchIce(call);
  }

  /* ------------------------- Tamu: gabung ruangan ------------------------- */
  $("btnJoin").onclick = () => joinRoom(inviteCode);
  $("btnOwnRoom").onclick = () => {
    inviteCode = null;
    history.replaceState(null, "", location.pathname);
    showView("idle");
  };

  async function joinRoom(code) {
    if (!code) return;
    if (!window.Peer) return setStatus("Library koneksi (PeerJS) gagal dimuat. Periksa internet lalu muat ulang halaman.", "error");
    if (!(await startCamera())) return setStatus("Izinkan akses kamera dulu untuk bergabung.", "error");
    net.role = "guest";
    net.code = code;
    setRoleLayout("guest");
    showView("guest");
    setStatus(`Menghubungkan ke ruangan ${code}…`);

    const peer = new Peer({ config: { iceServers: ICE_SERVERS } });
    net.peer = peer;
    peer.on("open", () => {
      const conn = peer.connect(PREFIX + code, { reliable: true });
      net.conn = conn;
      const timer = setTimeout(() => {
        if (net.conn === conn && !conn.open) {
          leaveRoom(true);
          setStatus("Gagal terhubung. Pastikan host masih membuka halaman SnapBooth, lalu coba lagi.", "error");
        }
      }, 15000);
      conn.on("open", () => {
        clearTimeout(timer);
        const call = peer.call(PREFIX + code, state.stream);
        net.call = call;
        call.on("stream", attachRemote);
        call.on("close", () => onPartnerLeft());
        watchIce(call);
        setStatus("Terhubung ke host. Menunggu video…", "ok");
      });
      conn.on("data", onData);
      conn.on("close", () => onPartnerLeft());
      conn.on("error", () => onPartnerLeft());
    });
    peer.on("error", netError);
  }

  /* ------------------------- Koneksi: umum ------------------------- */
  function attachRemote(stream) {
    remoteVideo.srcObject = stream;
    remoteVideo.play().catch(() => {});
    $("waiting").hidden = true;
    setStatus(net.role === "host"
      ? "Temanmu sudah di sini! Tekan ▶ Mulai Foto kapan saja."
      : "Terhubung! Tunggu host memulai foto, atau tekan ✅ Saya Siap.", "ok");
  }

  function onPartnerLeft(msg) {
    if (!net.role) return;
    remoteVideo.srcObject = null;
    if (net.role === "guest") {
      leaveRoom(true);
      setStatus("Host menutup ruangan atau koneksi terputus.", "warn");
      return;
    }
    try { net.call && net.call.close(); } catch (_) {}
    net.conn = null; net.call = null;
    $("waiting").hidden = false;
    setStatus((msg || "Temanmu keluar.") + " Link masih aktif, ia bisa masuk lagi.", "warn");
  }

  function watchIce(call) {
    const pc = call && call.peerConnection;
    if (!pc) return;
    pc.addEventListener("iceconnectionstatechange", () => {
      if (pc.iceConnectionState === "failed") {
        setStatus("Koneksi video gagal. Jaringan kalian mungkin memblokir koneksi langsung — coba pindah WiFi, atau pasang server TURN (lihat README).", "error");
      }
    });
  }

  function netError(e) {
    const t = e && e.type;
    let msg = "Terjadi masalah koneksi: " + (t || e);
    if (t === "peer-unavailable") msg = "Ruangan tidak ditemukan. Pastikan link/kodenya benar dan host masih membuka halaman.";
    else if (["network", "server-error", "socket-error", "socket-closed"].includes(t)) msg = "Tidak bisa menghubungi server perantara (PeerJS). Periksa internet lalu coba lagi.";
    else if (t === "browser-incompatible") msg = "Browser ini belum mendukung koneksi video langsung (WebRTC).";
    leaveRoom(true);
    setStatus(msg, "error");
  }

  $("btnLeave").onclick = () => leaveRoom(false);

  function leaveRoom(silent) {
    const { conn, call, peer } = net;
    const had = !!net.role;
    net.peer = net.conn = net.call = null;   // kosongkan dulu supaya event 'close' tidak memicu proses ganda
    net.role = null; net.code = null;
    try { conn && conn.close(); } catch (_) {}
    try { call && call.close(); } catch (_) {}
    try { peer && peer.destroy(); } catch (_) {}
    remoteVideo.srcObject = null;
    setRoleLayout(null);
    showView(inviteCode ? "guest" : "idle");
    setStatus("");
    if (had && !silent) toast("Keluar dari ruangan");
  }

  window.addEventListener("beforeunload", () => { try { net.peer && net.peer.destroy(); } catch (_) {} });

  /* ------------------------- Pesan antar-pengguna ------------------------- */
  function send(m) {
    if (net.role === "host" && net.conn && net.conn.open) {
      try { net.conn.send(m); } catch (_) {}
    }
  }

  const currentSettings = () => ({
    theme: state.theme, filter: state.filter, layout: $("layout").value, timer: $("timer").value,
    caption: $("caption").value, stickers: $("optStickers").checked, date: $("optDate").checked, mirror: $("optMirror").checked,
  });
  function syncSettings() { send({ t: "settings", s: currentSettings() }); }

  function applySettings(s) {   // dijalankan di sisi tamu
    if (!s || !THEMES[s.theme] || !LAYOUTS[s.layout] || !FILTERS[s.filter]) return;
    const layoutChanged = $("layout").value !== s.layout;
    $("layout").value = s.layout;
    $("timer").value = s.timer;
    $("caption").value = s.caption || "";
    $("optStickers").checked = !!s.stickers;
    $("optDate").checked = !!s.date;
    $("optMirror").checked = !!s.mirror;
    $("video").classList.toggle("mirror", !!s.mirror);
    syncMirror();
    if (s.theme !== state.theme) {
      state.theme = s.theme;
      document.body.dataset.theme = s.theme;
      document.querySelectorAll(".theme-card").forEach((c) => c.classList.toggle("active", c.dataset.key === s.theme));
      $("heroTitle").textContent = "📸 " + THEMES[s.theme].title.replace(" ♡", "");
    }
    setFilter(s.filter);   // sekaligus merender ulang strip
    if (layoutChanged) resetShots();
  }

  function receiveShot(m) {
    if (!Number.isInteger(m.i) || m.i < 0 || m.i >= state.shots.length || !m.buf) return Promise.resolve();
    const url = URL.createObjectURL(new Blob([m.buf], { type: "image/jpeg" }));
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement("canvas");
        c.width = PW * 2; c.height = PH * 2;
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        state.shots[m.i] = c;
        buildThumbs(); renderResult();
        resolve();
      };
      im.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Gagal memuat foto ke-${m.i + 1} dari host.`));
      };
      im.src = url;
    });
  }

  async function sendShot(i) {
    if (net.role !== "host" || !net.conn || !net.conn.open) return;
    const c = state.shots[i];
    if (!c) return;
    const blob = await new Promise((resolve) => c.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error(`Gagal menyiapkan foto ke-${i + 1} untuk dikirim.`);
    if (!net.conn || !net.conn.open) throw new Error("Koneksi dengan teman terputus sebelum foto terkirim.");
    net.conn.send({ t: "shot", i, buf: await blob.arrayBuffer() });
  }

  function onData(m) {
    if (!m || typeof m !== "object") return;
    const guest = net.role === "guest";
    switch (m.t) {
      case "settings": if (guest) applySettings(m.s); break;
      case "start":
        if (guest) {
          document.body.classList.remove("guest-results");
          $("btnReady").disabled = false;
          $("btnReady").textContent = "✅ Saya Siap";
          state.shots = Array(m.n).fill(null); buildDots(); buildThumbs(); renderResult();
        }
        break;
      case "reset":
        if (guest) {
          document.body.classList.remove("guest-results");
          $("btnReady").disabled = false;
          $("btnReady").textContent = "✅ Saya Siap";
          resetShots();
        }
        break;
      case "tick": if (guest) { showCount(m.n); buildDots(m.i); } break;
      case "flash": if (guest) { $("count").textContent = ""; doFlash(); } break;
      case "shot":
        if (guest) {
          incomingShots = incomingShots.then(() => receiveShot(m));
          incomingShots.catch((error) => {
            console.error("Gagal menerima hasil foto:", error);
            setStatus("Gagal memuat hasil foto dari host. Minta host mengirim ulang sesi foto.", "error");
          });
        }
        break;
      case "done":
        if (guest) {
          incomingShots.then(() => {
            if (net.role !== "guest") return;
            document.body.classList.add("guest-results");
            buildDots(); confetti(); toast("Selesai! 🎉"); saveHistory();
            $("resultSection").scrollIntoView({ behavior: "smooth", block: "start" });
          }).catch((error) => {
            console.error("Gagal menampilkan hasil sesi:", error);
            toast("Hasil foto gagal dimuat. Silakan ulangi sesi.");
          });
        }
        break;
      case "ready": if (!guest) toast("Temanmu sudah siap ✅"); break;
      case "full":
        if (guest) { leaveRoom(true); setStatus("Ruangan sudah penuh (maksimal 2 orang).", "error"); }
        break;
    }
  }

  /* ------------------------- Menggabungkan 2 kamera menjadi 1 foto ------------------------- */
  function canDuet() {
    return net.role === "host" && !!net.conn && net.conn.open && remoteVideo.videoWidth > 0;
  }

  function drawCover(ctx, vid, dx, dy, dw, dh, mirror) {
    const vw = vid.videoWidth, vh = vid.videoHeight, ta = dw / dh;
    let sw = vw, sh = vh, sx = 0, sy = 0;
    if (vw / vh > ta) { sw = vh * ta; sx = (vw - sw) / 2; } else { sh = vw / ta; sy = (vh - sh) / 2; }
    ctx.save();
    ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip();
    if (mirror) { ctx.translate(dx + dw / 2, 0); ctx.scale(-1, 1); ctx.translate(-(dx + dw / 2), 0); }
    ctx.drawImage(vid, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  }

  function captureDuet() {
    const c = document.createElement("canvas");
    c.width = PW * 2; c.height = PH * 2;
    const ctx = c.getContext("2d");
    const half = c.width / 2, mirror = $("optMirror").checked;
    ctx.filter = FILTERS[state.filter].css;
    drawCover(ctx, $("video"), 0, 0, half, c.height, mirror);        // kiri  = host
    drawCover(ctx, remoteVideo, half, 0, half, c.height, mirror);    // kanan = teman
    ctx.filter = "none";
    ctx.fillStyle = "#fff"; ctx.fillRect(half - 2, 0, 4, c.height);   // garis pemisah tipis
    return c;
  }

  function canStart() {
    if (net.role === "guest") { toast("Menunggu host memulai foto 😊"); return false; }
    if (net.role === "host") {
      if (!(net.conn && net.conn.open && remoteVideo.videoWidth > 0)) { toast("Tunggu temanmu bergabung dulu 👥"); return false; }
      return true;
    }
    if (mode === "duo") { toast("Buat ruangan dulu, atau pilih mode Solo"); return false; }
    return true;
  }

  function onCameraChanged() {   // setelah "Putar Kamera": ganti track video yang dikirim ke teman
    const track = state.stream && state.stream.getVideoTracks()[0];
    const pc = net.call && net.call.peerConnection;
    const sender = pc && pc.getSenders().find((s) => s.track && s.track.kind === "video");
    if (sender && track) sender.replaceTrack(track).catch(() => {});
    syncMirror();
    syncSettings();
  }

  /* ------------------------- Tombol & event ------------------------- */
  $("btnCopy").onclick = async () => {
    const input = $("roomLink");
    try { await navigator.clipboard.writeText(input.value); }
    catch (_) { input.select(); try { document.execCommand("copy"); } catch (__) {} }
    toast("Link disalin 📋");
  };
  $("btnShareLink").onclick = async () => {
    const url = $("roomLink").value;
    if (navigator.share) {
      try { await navigator.share({ title: "SnapBooth", text: "Yuk foto bareng di SnapBooth!", url }); } catch (_) {}
    } else $("btnCopy").click();
  };
  $("btnReady").onclick = () => {
    if (net.conn && net.conn.open) {
      net.conn.send({ t: "ready" });
      $("btnReady").disabled = true;
      $("btnReady").textContent = "✅ Kamu Siap";
      toast("Host diberi tahu ✅");
    }
  };
  $("btnReset").addEventListener("click", () => send({ t: "reset" }));

  // Setiap perubahan pengaturan di sisi host langsung diteruskan ke tamu
  document.addEventListener("click", (e) => { if (e.target.closest(".theme-card, .chip")) after(syncSettings); });
  document.addEventListener("change", (e) => {
    if (e.target.id === "optMirror") syncMirror();
    if (e.target.closest(".settings")) after(syncSettings);
  });
  $("caption").addEventListener("input", syncSettings);

  /* ------------------------- Init ------------------------- */
  syncMirror();
  if (inviteCode) setMode("duo");   // dibuka lewat link undangan → langsung ke mode berdua sebagai tamu

  window.Duo = {
    send, sendShot, canDuet, captureDuet, canStart, onCameraChanged,
    isGuest: () => net.role === "guest",
  };
})();
