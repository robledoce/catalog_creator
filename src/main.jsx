import "./storageShim.js";
import React from "react";
import ReactDOM from "react-dom/client";
import CatalogApp from "./CatalogApp.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CatalogApp />
  </React.StrictMode>
);
