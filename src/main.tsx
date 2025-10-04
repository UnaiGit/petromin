import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { PetrominRoot } from './PetrominRoot'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PetrominRoot />
  </StrictMode>,
)
