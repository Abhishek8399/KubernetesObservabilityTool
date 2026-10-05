import React from "react";
import { createRoot } from "react-dom/client";
import Explorer from "./universe";
import "./explorer.css";
import "./polish.css";
import "./universe.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Explorer />
  </React.StrictMode>,
);
