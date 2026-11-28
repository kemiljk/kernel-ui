import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@kernelui-lib/styles";
import "@kernelui-lib/react/styles.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
