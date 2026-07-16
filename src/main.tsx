import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSession } from './stores/useSessionStore'

// Subscribe before first render so the session is already resolving while React
// mounts, rather than kicking off on an effect after the shell has painted.
initSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
