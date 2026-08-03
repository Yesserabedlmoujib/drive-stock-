// import { StrictMode } from 'react';
// import { createRoot } from 'react-dom/client';
// import './index.css';
// import App from './App.tsx';
// import "./i18n";

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./index.css";

import { applyLanguage } from "@/lib/language";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext.tsx";
import "./i18n";

const savedLanguage = localStorage.getItem("language") || "fr";

applyLanguage(savedLanguage);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster />
    </AuthProvider>
  </StrictMode>,
);