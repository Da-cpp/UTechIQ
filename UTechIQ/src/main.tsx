import { createRoot } from "react-dom/client";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";

const root = createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
