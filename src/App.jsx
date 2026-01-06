import { Routes, Route } from 'react-router-dom'
import MainMenu from './pages/MainMenu'
import NewGame from './pages/NewGame'
import Civilopedia from './pages/Civilopedia'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainMenu />} />
      <Route path="/new-game" element={<NewGame />} />
      <Route path="/civilopedia" element={<Civilopedia />} />
    </Routes>
  )
}

export default App
