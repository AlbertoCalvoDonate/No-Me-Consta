import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { RedDeSeguridad } from './components/RedDeSeguridad'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RedDeSeguridad>
      <App />
    </RedDeSeguridad>
  </React.StrictMode>
)
