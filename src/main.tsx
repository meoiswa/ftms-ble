import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeAuth } from './sync/auth.ts'

async function main() {
  // Initialize auth (restore tokens from Service Worker, etc.)
  // Must complete before app renders to avoid race condition with useSync
  await initializeAuth()
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

main().catch(console.error)
