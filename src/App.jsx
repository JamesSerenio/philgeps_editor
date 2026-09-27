import { Routes, Route } from 'react-router-dom'
import ProjectListPage from './pages/ProjectListPage'
import ProjectEditorPage from './pages/ProjectEditorPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/project/:id" element={<ProjectEditorPage />} />
    </Routes>
  )
}

export default App
