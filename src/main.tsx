import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ConfigError } from "@/components/ConfigError";
import { supabaseConfigError } from "@/lib/supabase";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {supabaseConfigError ? <ConfigError message={supabaseConfigError} /> : <App />}
  </StrictMode>
);
