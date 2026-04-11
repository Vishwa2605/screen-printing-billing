(function initPwa() {
  // Disable PWA on localhost (prevents CSS bugs)
  if (
    location.hostname === "127.0.0.1" ||
    location.hostname === "localhost"
  ) {
    console.log("PWA disabled on localhost");
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("Service Worker Registered"))
      .catch((error) =>
        console.error("Service worker registration failed:", error)
      );
  });
})();