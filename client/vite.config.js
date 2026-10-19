import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite is the tool that runs our React app during development
// and turns JSX into plain JavaScript the browser understands.
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward any request starting with /api to the Express server.
    // The browser only ever talks to localhost:5173, so cookies just work.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
