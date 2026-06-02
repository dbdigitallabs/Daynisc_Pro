import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Global styles
const globalStyle = document.createElement('style')
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    width: 100%; min-height: 100vh;
    background: #0a0a0f;
    color: #d6dae6;
    font-family: 'Noto Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  #root { width: 100%; min-height: 100vh; }
  input, button, select, textarea { font-family: inherit; min-width: 0; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #0a0a0f; }
  ::-webkit-scrollbar-thumb { background: #2a3347; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #3a4560; }
  a { color: #00d4c8; text-decoration: none; }
  a:hover { text-decoration: underline; }
`
document.head.appendChild(globalStyle)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
