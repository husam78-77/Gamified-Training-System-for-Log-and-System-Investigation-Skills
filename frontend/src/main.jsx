import './assets/globals.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '@xterm/xterm/css/xterm.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

    <GoogleOAuthProvider clientId="apps.googleusercontent.com">

      <App />

    </GoogleOAuthProvider>

  </React.StrictMode>
);