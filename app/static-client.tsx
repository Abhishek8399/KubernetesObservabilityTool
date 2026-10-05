import React from "react";
import { createRoot } from "react-dom/client";
import Explorer from "./explorer";
import "./explorer.css";
import "./polish.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Explorer />
  </React.StrictMode>,
);
