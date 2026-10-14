import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Go backend, so we don't need CORS.
    proxy: {
      "/getData": "http://localhost:8081",
      "/updateData": "http://localhost:8081",
    },
  },
});
