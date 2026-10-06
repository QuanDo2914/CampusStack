import { ErrorBoundary } from "./components/ErrorBoundary";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
const TileLab = import.meta.env.DEV
  ? React.lazy(() => import("./dev/TileLab"))
  : null;
const showTileLab =
  import.meta.env.DEV && window.location.pathname === "/__dev/tiles";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {showTileLab && TileLab ? (
        <React.Suspense fallback={<p>Loading tile lab…</p>}>
          <TileLab />
        </React.Suspense>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </React.StrictMode>,
);

import "./expanded.css";

import "./tabletop.css";
