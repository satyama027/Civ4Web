import { useNavigate } from 'react-router-dom';

const NewGame = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '20px', color: 'white', background: '#1a1a2e', minHeight: '100vh' }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: '20px', padding: '10px 20px' }}>
        Back to Main Menu
      </button>
      <h1>New Game Setup</h1>
      <p>Game setup screen will be implemented here.</p>
    </div>
  );
};

export default NewGame;
