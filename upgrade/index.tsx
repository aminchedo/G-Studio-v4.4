import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "@/styles/chat-enhancements.css";
// Use src/App.tsx — Enhanced chat (MessageBubble, EnhancedMessageList, EnhancedInputArea, Copy/Retry/Regenerate)
import App from "./App";
import { initializeGlobalErrorHandlers } from "@/services/error-handler-global";

initializeGlobalErrorHandlers();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
