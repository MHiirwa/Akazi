import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import "./index.css";

// Only wrap in the Google provider once a Client ID exists, so the app runs
// fine before you paste one in (the Google button falls back to a notice).
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const tree = googleClientId ? (
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>{tree}</React.StrictMode>
);
