"use strict";

window.addEventListener("load", () => {
  const modal = document.getElementById("installModal");
  const installButton = document.getElementById("btnInstallApp");
  const laterButton = document.getElementById("btnInstallLater");
  const closeButton = document.getElementById("btnInstallClose");
  const headerInstallButton = document.getElementById("btnHeaderInstall");
  const help = document.getElementById("installHelp");
  if (!(modal instanceof HTMLDialogElement) ||
      !(installButton instanceof HTMLButtonElement) ||
      !(laterButton instanceof HTMLButtonElement) ||
      !(closeButton instanceof HTMLButtonElement) ||
      !(headerInstallButton instanceof HTMLButtonElement) ||
      !(help instanceof HTMLParagraphElement)) return;

  let installPrompt = null;
  let promptShown = false;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener("app:splash-ended", () => {
    if (promptShown || isStandalone || sessionStorage.getItem("installPromptDismissed")) return;
    promptShown = true;
    window.setTimeout(() => {
      if (!modal.open) modal.showModal();
    }, 300);
  }, { once: true });

  const dismiss = () => {
    sessionStorage.setItem("installPromptDismissed", "true");
  };

  laterButton.addEventListener("click", dismiss);
  closeButton.addEventListener("click", dismiss);
  modal.addEventListener("close", dismiss);
  headerInstallButton.addEventListener("click", () => {
    help.hidden = true;
    if (!modal.open) modal.showModal();
  });

  installButton.addEventListener("click", async () => {
    if (!installPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      help.textContent = isIOS
        ? 'Untuk memasang di iPhone/iPad: ketuk tombol Bagikan, lalu pilih "Tambah ke Layar Utama".'
        : 'Jika prompt pemasangan tidak muncul, buka menu browser (⋮), lalu pilih "Instal aplikasi" atau "Tambahkan ke layar utama".';
      help.hidden = false;
      return;
    }

    installButton.disabled = true;
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      installPrompt = null;
      if (outcome === "accepted") modal.close();
    } catch (error) {
      console.error("Gagal membuka prompt instalasi aplikasi:", error);
      help.textContent = "Prompt pemasangan tidak dapat dibuka. Coba gunakan menu browser untuk memasang aplikasi.";
      help.hidden = false;
    } finally {
      installButton.disabled = false;
    }
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    if (modal.open) modal.close();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.error("Gagal mendaftarkan service worker:", error);
    });
  }
});
