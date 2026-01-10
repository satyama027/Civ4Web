import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { civilizations } from '../data/civilizations';
import { leaders, leaderTraits } from '../data/leaders';
import {
  difficultyLevels,
  mapTypes,
  mapSizes,
  gameSpeeds,
  startingEras,
  climateTypes,
  seaLevels,
  barbarianSettings,
  defaultGameSettings
} from '../data/gameOptions';
import '../styles/NewGame.css';

const NewGame = () => {
  const navigate = useNavigate();

  // Player settings - 'random' or a leader object
  const [selectedLeader, setSelectedLeader] = useState(leaders[0]);
  const [isRandomLeader, setIsRandomLeader] = useState(false);

  // Game settings
  const [settings, setSettings] = useState(defaultGameSettings);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get current map size for opponent limits
  const currentMapSize = mapSizes.find(m => m.id === settings.mapSize);
  const maxOpponents = currentMapSize ? currentMapSize.maxPlayers - 1 : 5;

  // Ensure opponents don't exceed max when map size changes
  const effectiveOpponents = Math.min(settings.numOpponents, maxOpponents);

  // Get the civilization for the selected leader
  const selectedCiv = useMemo(() => {
    if (isRandomLeader) return null;
    return civilizations.find(c => c.name === selectedLeader.civilization);
  }, [selectedLeader, isRandomLeader]);

  // Get leader traits description
  const leaderTraitDescriptions = useMemo(() => {
    if (isRandomLeader) return [];
    return selectedLeader.traits.map(trait => ({
      name: trait,
      description: leaderTraits[trait] || ''
    }));
  }, [selectedLeader, isRandomLeader]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLeaderChange = (value) => {
    if (value === 'random') {
      setIsRandomLeader(true);
    } else {
      setIsRandomLeader(false);
      setSelectedLeader(leaders.find(l => l.id === value));
    }
  };

  const handleStartGame = () => {
    // If random, pick a random leader now
    const finalLeader = isRandomLeader
      ? leaders[Math.floor(Math.random() * leaders.length)]
      : selectedLeader;
    const finalCiv = civilizations.find(c => c.name === finalLeader.civilization);

    const gameConfig = {
      civilization: finalCiv,
      leader: finalLeader,
      ...settings,
      numOpponents: effectiveOpponents
    };
    console.log('Starting game with config:', gameConfig);

    // Navigate to game screen with config
    navigate('/game', { state: gameConfig });
  };

  return (
    <div className="new-game">
      {/* Decorative elements */}
      <div className="corner-ornament top-left" />
      <div className="corner-ornament top-right" />
      <div className="corner-ornament bottom-left" />
      <div className="corner-ornament bottom-right" />

      {/* Header */}
      <header className="new-game-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back</span>
        </button>
        <div className="header-title">
          <h1>New Game</h1>
          <p className="header-subtitle">Configure Your Empire</p>
        </div>
        <div className="header-spacer" />
      </header>

      <div className="new-game-content">
        {/* Left Column - Game Settings */}
        <section className="settings-section">
          <div className="section-header">
            <h2>Game Settings</h2>
            <div className="header-line" />
          </div>

          {/* Core Settings */}
          <div className="settings-grid">
            {/* Difficulty */}
            <div className="setting-group">
              <label>Difficulty</label>
              <select
                value={settings.difficulty}
                onChange={(e) => updateSetting('difficulty', e.target.value)}
                className="styled-select"
              >
                {difficultyLevels.map(diff => (
                  <option key={diff.id} value={diff.id}>{diff.name}</option>
                ))}
              </select>
              <span className="setting-hint">
                {difficultyLevels.find(d => d.id === settings.difficulty)?.description}
              </span>
            </div>

            {/* Map Type */}
            <div className="setting-group">
              <label>Map Type</label>
              <select
                value={settings.mapType}
                onChange={(e) => updateSetting('mapType', e.target.value)}
                className="styled-select"
              >
                {mapTypes.map(map => (
                  <option key={map.id} value={map.id}>{map.name}</option>
                ))}
              </select>
              <span className="setting-hint">
                {mapTypes.find(m => m.id === settings.mapType)?.description}
              </span>
            </div>

            {/* Map Size */}
            <div className="setting-group">
              <label>Map Size</label>
              <select
                value={settings.mapSize}
                onChange={(e) => updateSetting('mapSize', e.target.value)}
                className="styled-select"
              >
                {mapSizes.map(size => (
                  <option key={size.id} value={size.id}>
                    {size.name} (up to {size.maxPlayers} players)
                  </option>
                ))}
              </select>
              <span className="setting-hint">
                {mapSizes.find(s => s.id === settings.mapSize)?.description}
              </span>
            </div>

            {/* Game Speed */}
            <div className="setting-group">
              <label>Game Speed</label>
              <select
                value={settings.gameSpeed}
                onChange={(e) => updateSetting('gameSpeed', e.target.value)}
                className="styled-select"
              >
                {gameSpeeds.map(speed => (
                  <option key={speed.id} value={speed.id}>{speed.name}</option>
                ))}
              </select>
              <span className="setting-hint">
                {gameSpeeds.find(s => s.id === settings.gameSpeed)?.description}
              </span>
            </div>

            {/* Number of Opponents */}
            <div className="setting-group">
              <label>AI Opponents</label>
              <div className="opponent-selector">
                <button
                  className="opponent-btn"
                  onClick={() => updateSetting('numOpponents', Math.max(1, effectiveOpponents - 1))}
                  disabled={effectiveOpponents <= 1}
                >
                  −
                </button>
                <span className="opponent-count">{effectiveOpponents}</span>
                <button
                  className="opponent-btn"
                  onClick={() => updateSetting('numOpponents', Math.min(maxOpponents, effectiveOpponents + 1))}
                  disabled={effectiveOpponents >= maxOpponents}
                >
                  +
                </button>
              </div>
              <span className="setting-hint">Maximum {maxOpponents} for this map size</span>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>Advanced Options</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={showAdvanced ? 'rotated' : ''}
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="advanced-settings">
              <div className="settings-grid">
                {/* Starting Era */}
                <div className="setting-group">
                  <label>Starting Era</label>
                  <select
                    value={settings.startingEra}
                    onChange={(e) => updateSetting('startingEra', e.target.value)}
                    className="styled-select"
                  >
                    {startingEras.map(era => (
                      <option key={era.id} value={era.id}>{era.name} ({era.year})</option>
                    ))}
                  </select>
                </div>

                {/* Climate */}
                <div className="setting-group">
                  <label>Climate</label>
                  <select
                    value={settings.climate}
                    onChange={(e) => updateSetting('climate', e.target.value)}
                    className="styled-select"
                  >
                    {climateTypes.map(climate => (
                      <option key={climate.id} value={climate.id}>{climate.name}</option>
                    ))}
                  </select>
                  <span className="setting-hint">
                    {climateTypes.find(c => c.id === settings.climate)?.description}
                  </span>
                </div>

                {/* Sea Level */}
                <div className="setting-group">
                  <label>Sea Level</label>
                  <select
                    value={settings.seaLevel}
                    onChange={(e) => updateSetting('seaLevel', e.target.value)}
                    className="styled-select"
                  >
                    {seaLevels.map(level => (
                      <option key={level.id} value={level.id}>{level.name}</option>
                    ))}
                  </select>
                  <span className="setting-hint">
                    {seaLevels.find(l => l.id === settings.seaLevel)?.description}
                  </span>
                </div>

                {/* Barbarians */}
                <div className="setting-group">
                  <label>Barbarians</label>
                  <select
                    value={settings.barbarians}
                    onChange={(e) => updateSetting('barbarians', e.target.value)}
                    className="styled-select"
                  >
                    {barbarianSettings.map(barb => (
                      <option key={barb.id} value={barb.id}>{barb.name}</option>
                    ))}
                  </select>
                  <span className="setting-hint">
                    {barbarianSettings.find(b => b.id === settings.barbarians)?.description}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Column - Leader Selection */}
        <section className="player-section">
          <div className="section-header">
            <h2>Your Leader</h2>
            <div className="header-line" />
          </div>

          {/* Leader Selection */}
          <div className="selection-group">
            <div className="group-header">
              <label>Choose Leader</label>
            </div>
            <div className="leader-selector">
              <select
                value={isRandomLeader ? 'random' : selectedLeader.id}
                onChange={(e) => handleLeaderChange(e.target.value)}
                className="styled-select"
              >
                <option value="random">Random Leader</option>
                <optgroup label="All Leaders">
                  {[...leaders].sort((a, b) => a.name.localeCompare(b.name)).map(leader => (
                    <option key={leader.id} value={leader.id}>
                      {leader.name} ({leader.civilization})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Leader Info - shown when not random */}
            {!isRandomLeader && selectedCiv && (
              <>
                {/* Civilization Details */}
                <div className="civ-details">
                  <div className="civ-name">{selectedCiv.name}</div>
                  <div className="detail-item">
                    <span className="detail-label">Unique Unit</span>
                    <span className="detail-value">{selectedCiv.uniqueUnit}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Unique Building</span>
                    <span className="detail-value">{selectedCiv.uniqueBuilding}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Starting Techs</span>
                    <span className="detail-value">{selectedCiv.startingTechs.join(', ')}</span>
                  </div>
                </div>

                {/* Leader Traits */}
                <div className="leader-traits">
                  <div className="traits-header">Leader Traits</div>
                  {leaderTraitDescriptions.map(trait => (
                    <div key={trait.name} className="trait-item">
                      <span className="trait-name">{trait.name}</span>
                      <span className="trait-desc">{trait.description}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Random placeholder */}
            {isRandomLeader && (
              <div className="random-placeholder">
                <div className="random-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p>A random leader will be selected when you start the game</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Footer with Start Button */}
      <footer className="new-game-footer">
        <div className="footer-summary">
          <span className="summary-item">
            {isRandomLeader ? (
              <strong>Random Leader</strong>
            ) : (
              <><strong>{selectedLeader.name}</strong> of <strong>{selectedCiv?.name}</strong></>
            )}
          </span>
          <span className="summary-divider">|</span>
          <span className="summary-item">
            {difficultyLevels.find(d => d.id === settings.difficulty)?.name}
          </span>
          <span className="summary-divider">|</span>
          <span className="summary-item">
            {mapTypes.find(m => m.id === settings.mapType)?.name}
          </span>
        </div>
        <button className="start-game-btn" onClick={handleStartGame}>
          <span className="btn-text">Start Game</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </footer>
    </div>
  );
};

export default NewGame;
