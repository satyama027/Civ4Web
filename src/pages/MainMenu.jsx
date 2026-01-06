import { useNavigate } from 'react-router-dom';
import '../styles/MainMenu.css';

const MainMenu = () => {
  const navigate = useNavigate();

  const handleNewGame = () => {
    navigate('/new-game');
  };

  const handleCivilopedia = () => {
    navigate('/civilopedia');
  };

  return (
    <div className="main-menu">
      <div className="main-menu-container">
        <h1 className="game-title">Civilization IV: Beyond the Sword</h1>
        <div className="menu-buttons">
          <button className="menu-button" onClick={handleNewGame}>
            New Game
          </button>
          <button className="menu-button" onClick={handleCivilopedia}>
            Civilopedia
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
