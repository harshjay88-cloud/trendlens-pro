import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Black & White Hybrid Pro design system. Imported AFTER index.css so the
// mono theme token blocks win the cascade for their themes only — the legacy
// themes keep every value they have today.
import './ui/tokens.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
