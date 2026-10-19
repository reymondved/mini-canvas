import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite is the tool that runs our React app during development
// and turns JSX into plain JavaScript the browser understands.
export default defineConfig({
  plugins: [react()],
});
