import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { DisplayGraph } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DisplayGraph />
  </StrictMode>,
)