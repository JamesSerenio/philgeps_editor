import { Routes, Route } from 'react-router-dom'
import ProjectListPage from './pages/ProjectListPage'
import ProjectEditorPage from './pages/ProjectEditorPage'
import './App.css'
import './styles/design-tokens.css'
import './styles/global-premium.css'
import './styles/editor-layout.css'
import './styles/editor-components.css'
import './styles/editor-animations.css'
import './styles/editor-responsive.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/project/:id" element={<ProjectEditorPage />} />
    </Routes>
  )
}

export default App
