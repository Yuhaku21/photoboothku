"use strict";

window.addEventListener("load", () => {
  const splash = document.getElementById("splashScreen");
  if (!splash) return;

  window.setTimeout(() => {
    splash.classList.add("splash-screen--hidden");
    splash.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      splash.remove();
      window.dispatchEvent(new Event("app:splash-ended"));
    }, 600);
  }, 5000);
}, { once: true });
