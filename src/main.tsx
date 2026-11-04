import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

const isInstalledPwa = window.matchMedia('(display-mode: standalone)').matches
  || window.matchMedia('(display-mode: fullscreen)').matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;

if (isInstalledPwa) {
  const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
  void orientation?.lock?.('landscape').catch(() => {
    // The manifest remains the primary orientation request; this is a supported-browser enhancement.
  });
}

createRoot(document.getElementById("root")!).render(<App />);
