import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import '../styles/MainMenu.css';

const MainMenu = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Atmospheric particle effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 10,
      size: Math.random() * 2 + 0.5,
      speedY: Math.random() * 0.5 + 0.2,
      speedX: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.2,
      golden: Math.random() > 0.7
    });

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < 60; i++) {
        const p = createParticle();
        p.y = Math.random() * canvas.height;
        particles.push(p);
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        p.y -= p.speedY;
        p.x += p.speedX;

        if (p.y < -10) {
          particles[index] = createParticle();
        }

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        if (p.golden) {
          gradient.addColorStop(0, `rgba(201, 162, 39, ${p.opacity})`);
          gradient.addColorStop(1, 'rgba(201, 162, 39, 0)');
        } else {
          gradient.addColorStop(0, `rgba(240, 230, 210, ${p.opacity * 0.6})`);
          gradient.addColorStop(1, 'rgba(240, 230, 210, 0)');
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener('resize', () => {
      resizeCanvas();
      initParticles();
    });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleNewGame = () => {
    navigate('/new-game');
  };

  const handleCivilopedia = () => {
    navigate('/civilopedia');
  };

  return (
    <div className="main-menu">
      {/* Atmospheric canvas background */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* Decorative corner ornaments */}
      <div className="corner-ornament top-left" />
      <div className="corner-ornament top-right" />
      <div className="corner-ornament bottom-left" />
      <div className="corner-ornament bottom-right" />

      {/* Vignette overlay */}
      <div className="vignette" />

      {/* Main content */}
      <div className="main-menu-container">
        <div className="title-section">
          <div className="title-ornament" />
          <h1 className="game-title">
            <span className="title-prefix">Sid Meier's</span>
            <span className="title-main">Civilization IV</span>
            <span className="title-suffix">Beyond the Sword</span>
          </h1>
          <div className="title-ornament flipped" />
        </div>

        <div className="menu-section">
          <nav className="menu-buttons" role="navigation" aria-label="Main menu">
            <button className="menu-button" onClick={handleNewGame}>
              <span className="button-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 4v16m-8-8h16" strokeLinecap="round" />
                </svg>
              </span>
              <span className="button-text">New Game</span>
              <span className="button-shine" />
            </button>

            <button className="menu-button" onClick={handleCivilopedia}>
              <span className="button-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <path d="M8 7h8M8 11h6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="button-text">Civilopedia</span>
              <span className="button-shine" />
            </button>
          </nav>
        </div>

        <footer className="menu-footer">
          <p className="credits">A tribute to Firaxis Games</p>
        </footer>
      </div>
    </div>
  );
};

export default MainMenu;
