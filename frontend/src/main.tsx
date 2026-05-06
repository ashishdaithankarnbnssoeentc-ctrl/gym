
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./index.css";
import { initSentry } from "./sentry";

// Initialize Sentry for error tracking
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
