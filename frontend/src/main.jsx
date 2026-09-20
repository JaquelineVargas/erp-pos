import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ArqueoProvider } from './contexts/ArqueoContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ArqueoProvider>
      <App />
    </ArqueoProvider>
  </StrictMode>,
)
