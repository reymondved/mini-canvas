import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import '@fontsource-variable/inter'; // the Inter font, served from our own app (no outside requests)
import './styles.css';

// Starting point: find <div id="root"> in index.html and render the app inside it.
// BrowserRouter lets the app show different pages for different URLs.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
