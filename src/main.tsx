import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./registerSW";

// Registra Service Worker apenas em domínios permitidos (app.furionpay.com)
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
