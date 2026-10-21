"use strict";

(() => {
  const STORAGE_KEY = "photoboothku-photos-v1";
  const MAX_RECENT_PHOTOS = 8;
  const pages = {
    studio: document.getElementById("studioPage"),
    gallery: document.getElementById("galleryPage"),
    print: document.getElementById("printPage"),
    help: document.getElementById("helpPage"),
  };
  const historyGrid = document.getElementById("historyGrid");
  const savedGrid = document.getElementById("savedGrid");
  const orderModal = document.getElementById("photoOrderModal");
  const orderPreview = document.getElementById("orderPreview");
  const orderButton = document.getElementById("btnOrderWhatsApp");
  let photos = [];
  let selectedPhoto = null;

  function notify(message) {
    if (typeof window.toast === "function") window.toast(message);
    else console.error(message);
  }

  function loadPhotos() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new Error("Format penyimpanan foto tidak valid.");
      return parsed.filter((photo) =>
        photo && typeof photo.id === "string" &&
        typeof photo.image === "string" && photo.image.startsWith("data:image/") &&
        typeof photo.createdAt === "string" && typeof photo.saved === "boolean");
    } catch (error) {
      console.error("Gagal membaca foto dari penyimpanan lokal:", error);
      notify("Riwayat foto tidak dapat dibaca dari penyimpanan perangkat.");
      return [];
    }
  }

  function persistPhotos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
      return true;
    } catch (error) {
      console.error("Gagal menyimpan foto ke penyimpanan lokal:", error);
      notify("Penyimpanan perangkat penuh. Hapus sebagian data browser lalu coba lagi.");
      return false;
    }
  }

  function makeEmpty(message) {
    const empty = document.createElement("p");
    empty.className = "collection-empty";
    empty.textContent = message;
    return empty;
  }

  function makePhotoCard(photo, isSavedList) {
    const card = document.createElement("article");
    card.className = "photo-card";
    const openButton = document.createElement("button");
    openButton.className = "photo-open";
    openButton.type = "button";
    openButton.setAttribute("aria-label", isSavedList ? "Pilih foto untuk dicetak" : "Lihat foto");
    const image = document.createElement("img");
    image.src = photo.image;
    image.alt = `Hasil foto ${new Date(photo.createdAt).toLocaleDateString("id-ID")}`;
    image.loading = "lazy";
    const date = document.createElement("span");
    date.className = "photo-date";
    date.textContent = new Date(photo.createdAt).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
    openButton.append(image, date);
    if (isSavedList) {
      openButton.addEventListener("click", () => openOrder(photo));
    }
    card.appendChild(openButton);

    if (!isSavedList) {
      const saveButton = document.createElement("button");
      saveButton.className = "btn photo-save";
      saveButton.type = "button";
      saveButton.textContent = photo.saved ? "✓ Tersimpan di Galeri" : "Simpan ke Galeri";
      saveButton.disabled = photo.saved;
      saveButton.addEventListener("click", () => saveToGallery(photo.id));
      card.appendChild(saveButton);
    }
    return card;
  }

  function renderPhotos() {
    historyGrid.replaceChildren();
    savedGrid.replaceChildren();
    if (!photos.length) {
      historyGrid.appendChild(makeEmpty("Belum ada foto. Yuk buat foto pertama kamu di Studio!"));
      savedGrid.appendChild(makeEmpty("Belum ada foto tersimpan. Simpan foto dari tab Galeri untuk mulai."));
      return;
    }
    const savedPhotos = photos.filter((photo) => photo.saved);
    photos.forEach((photo) => historyGrid.appendChild(makePhotoCard(photo, false)));
    if (savedPhotos.length) savedPhotos.forEach((photo) => savedGrid.appendChild(makePhotoCard(photo, true)));
    else savedGrid.appendChild(makeEmpty("Belum ada foto tersimpan. Simpan foto dari tab Galeri untuk mulai."));
  }

  function saveToGallery(photoId) {
    const photo = photos.find((item) => item.id === photoId);
    if (!photo || photo.saved) return;
    photo.saved = true;
    if (!persistPhotos()) {
      photo.saved = false;
      return;
    }
    renderPhotos();
    notify("Foto berhasil disimpan ke Galeri.");
  }

  function openOrder(photo) {
    selectedPhoto = photo;
    orderPreview.src = photo.image;
    orderModal.showModal();
  }

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const pageName = button.dataset.page;
      if (!Object.hasOwn(pages, pageName)) return;
      Object.entries(pages).forEach(([name, page]) => {
        page.hidden = name !== pageName;
        page.classList.toggle("is-active", name === pageName);
      });
      document.querySelectorAll(".nav-item").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        if (active) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });
      if (pageName === "gallery" || pageName === "print") renderPhotos();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  window.addEventListener("photobooth:photo-created", (event) => {
    const image = event.detail?.image;
    if (typeof image !== "string" || !image.startsWith("data:image/")) return;
    const photo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      image,
      createdAt: new Date().toISOString(),
      saved: false,
    };
    photos.unshift(photo);
    const recent = photos.filter((item) => !item.saved);
    const keepRecent = new Set(recent.slice(0, MAX_RECENT_PHOTOS).map((item) => item.id));
    photos = photos.filter((item) => item.saved || keepRecent.has(item.id));
    if (!persistPhotos()) photos = photos.filter((item) => item.id !== photo.id);
    renderPhotos();
  });

  orderButton.addEventListener("click", () => {
    if (!selectedPhoto) return;
    const message = `Halo, saya ingin melanjutkan transaksi cetak foto Photoboothku. ID foto: ${selectedPhoto.id}.`;
    window.location.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  });

  photos = loadPhotos();
  renderPhotos();
})();
