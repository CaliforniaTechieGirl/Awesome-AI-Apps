import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SudokuSolver from './SudokuSolver.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SudokuSolver />
  </StrictMode>,
)
