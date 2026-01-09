import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { yields } from '../data/yields';
import { resources } from '../data/resources';
import { terrainTypes } from '../data/terrainTypes';
import { improvements } from '../data/improvements';
import { units } from '../data/units';
import { technologies } from '../data/technologies';
import { buildings } from '../data/buildings';
import { civilizations } from '../data/civilizations';
import { leaders, leaderTraits } from '../data/leaders';
import '../styles/Civilopedia.css';

const Civilopedia = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'yields', name: 'Yields', icon: '📊', data: yields },
    { id: 'resources', name: 'Resources', icon: '💎', data: resources },
    { id: 'terrain', name: 'Terrain', icon: '🏔️', data: terrainTypes },
    { id: 'improvements', name: 'Improvements', icon: '🏗️', data: improvements },
    { id: 'units', name: 'Units', icon: '⚔️', data: units },
    { id: 'technologies', name: 'Technologies', icon: '🔬', data: technologies },
    { id: 'buildings', name: 'Buildings', icon: '🏛️', data: buildings },
    { id: 'civilizations', name: 'Civilizations', icon: '🏰', data: civilizations },
    { id: 'leaders', name: 'Leaders', icon: '👑', data: leaders }
  ];

  const navigateToItem = (categoryId, itemName) => {
    setSelectedCategory(categoryId);
    const category = categories.find(c => c.id === categoryId);
    const item = category.data.find(i => i.name === itemName || i.uniqueUnit === itemName || i.uniqueBuilding === itemName);
    if (item) {
      setSelectedItem(item);
    }
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedItem(null);
    setSearchTerm('');
  };

  const currentCategory = selectedCategory ? categories.find(c => c.id === selectedCategory) : null;
  const filteredData = currentCategory ? currentCategory.data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const renderUnitDetails = (unit) => (
    <div className="item-details">
      <header className="details-header">
        <h2>
          {unit.name}
          {unit.isUnique && <span className="unique-badge">Unique</span>}
        </h2>
        <p className="item-category-tag">{unit.category}</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Cost</span>
          <span className="stat-value">{unit.cost}</span>
          <span className="stat-unit">Production</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Strength</span>
          <span className="stat-value">{unit.strength}</span>
          <span className="stat-unit">Combat</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Movement</span>
          <span className="stat-value">{unit.movement}</span>
          <span className="stat-unit">Tiles</span>
        </div>
      </div>

      <div className="details-section">
        <h3 className="section-title">Requirements</h3>
        <div className="info-grid">
          {unit.requiredTech && (
            <div className="info-row">
              <span className="info-label">Technology</span>
              <span className="info-value">{unit.requiredTech}</span>
            </div>
          )}
          {unit.civilization && (
            <div className="info-row">
              <span className="info-label">Civilization</span>
              <span className="info-value clickable" onClick={() => navigateToItem('civilizations', unit.civilization)}>
                {unit.civilization}
              </span>
            </div>
          )}
          {unit.replaces && (
            <div className="info-row">
              <span className="info-label">Replaces</span>
              <span className="info-value">{unit.replaces}</span>
            </div>
          )}
        </div>
      </div>

      {unit.abilities && unit.abilities.length > 0 && (
        <div className="details-section">
          <h3 className="section-title">Abilities</h3>
          <ul className="feature-list">
            {unit.abilities.map((ability, idx) => (
              <li key={idx}>{ability}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="details-section">
        <h3 className="section-title">Description</h3>
        <p className="description-text">{unit.description}</p>
      </div>
    </div>
  );

  const renderTechnologyDetails = (tech) => (
    <div className="item-details">
      <header className="details-header">
        <h2>{tech.name}</h2>
        <p className="item-category-tag">{tech.era} Era</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card wide">
          <span className="stat-label">Research Cost</span>
          <span className="stat-value">{tech.cost}</span>
          <span className="stat-unit">Science</span>
        </div>
      </div>

      <div className="details-section">
        <h3 className="section-title">Unlocks</h3>
        <ul className="feature-list">
          {tech.unlocks.map((unlock, idx) => (
            <li key={idx}>{unlock}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderBuildingDetails = (building) => (
    <div className="item-details">
      <header className="details-header">
        <h2>
          {building.name}
          {building.isUnique && <span className="unique-badge">Unique</span>}
        </h2>
        <p className="item-category-tag">{building.category}</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card wide">
          <span className="stat-label">Construction Cost</span>
          <span className="stat-value">{building.cost}</span>
          <span className="stat-unit">Production</span>
        </div>
      </div>

      <div className="details-section">
        <h3 className="section-title">Requirements</h3>
        <div className="info-grid">
          {building.tech && (
            <div className="info-row">
              <span className="info-label">Technology</span>
              <span className="info-value">{building.tech}</span>
            </div>
          )}
          {building.civilization && (
            <div className="info-row">
              <span className="info-label">Civilization</span>
              <span className="info-value clickable" onClick={() => navigateToItem('civilizations', building.civilization)}>
                {building.civilization}
              </span>
            </div>
          )}
          {building.replaces && (
            <div className="info-row">
              <span className="info-label">Replaces</span>
              <span className="info-value">{building.replaces}</span>
            </div>
          )}
        </div>
      </div>

      <div className="details-section">
        <h3 className="section-title">Effects</h3>
        <ul className="feature-list">
          {building.effects.map((effect, idx) => (
            <li key={idx}>{effect}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderCivilizationDetails = (civ) => (
    <div className="item-details">
      <header className="details-header">
        <h2>{civ.name}</h2>
        <p className="item-category-tag">Civilization</p>
      </header>

      <div className="details-section">
        <h3 className="section-title">Unique Attributes</h3>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">Unique Unit</span>
            <span className="info-value clickable" onClick={() => navigateToItem('units', civ.uniqueUnit)}>
              {civ.uniqueUnit}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Unique Building</span>
            <span className="info-value clickable" onClick={() => navigateToItem('buildings', civ.uniqueBuilding)}>
              {civ.uniqueBuilding}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Starting Techs</span>
            <span className="info-value">{civ.startingTechs.join(', ')}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h3 className="section-title">Leaders</h3>
        <div className="leaders-grid">
          {civ.leaders.map((leader, idx) => (
            <div key={idx} className="leader-card">
              <h4 className="leader-name clickable" onClick={() => navigateToItem('leaders', leader.name)}>
                {leader.name}
              </h4>
              <p className="leader-traits">{leader.traits.join(' / ')}</p>
              <div className="trait-details">
                {leader.traits.map((trait, tidx) => (
                  <p key={tidx} className="trait-description">
                    <strong>{trait}:</strong> {leaderTraits[trait]}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLeaderDetails = (leader) => (
    <div className="item-details">
      <header className="details-header">
        <h2>{leader.name}</h2>
        <p className="item-category-tag">Leader</p>
      </header>

      <div className="details-section">
        <h3 className="section-title">Profile</h3>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">Civilization</span>
            <span className="info-value clickable" onClick={() => navigateToItem('civilizations', leader.civilization)}>
              {leader.civilization}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Favorite Civic</span>
            <span className="info-value">{leader.favoriteCivic}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h3 className="section-title">Leader Traits</h3>
        <div className="traits-list">
          {leader.traits.map((trait, idx) => (
            <div key={idx} className="trait-card">
              <h4>{trait}</h4>
              <p>{leaderTraits[trait]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderYieldDetails = (yield_item) => (
    <div className="item-details">
      <header className="details-header">
        <div className="header-with-icon">
          {yield_item.svgIcon && (
            <div className="header-icon" dangerouslySetInnerHTML={{ __html: yield_item.svgIcon }} />
          )}
          <div>
            <h2>{yield_item.name}</h2>
            <p className="item-category-tag">Yield</p>
          </div>
        </div>
      </header>

      <div className="details-section">
        <p className="description-text highlight">{yield_item.description}</p>
      </div>

      <div className="details-section">
        <h3 className="section-title">Sources</h3>
        <ul className="feature-list">
          {yield_item.sources.map((source, idx) => (
            <li key={idx}>{source}</li>
          ))}
        </ul>
      </div>

      <div className="details-section">
        <h3 className="section-title">Game Mechanics</h3>
        <ul className="feature-list">
          {yield_item.mechanics.map((mechanic, idx) => (
            <li key={idx}>{mechanic}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderResourceDetails = (resource) => (
    <div className="item-details">
      <header className="details-header">
        <div className="header-with-icon">
          {resource.svgIcon && (
            <div className="header-icon" dangerouslySetInnerHTML={{ __html: resource.svgIcon }} />
          )}
          <div>
            <h2>{resource.name}</h2>
            <p className="item-category-tag">{resource.category}</p>
          </div>
        </div>
      </header>

      {(resource.yields || resource.happinessBonus || resource.healthBonus) && (
        <div className="stats-grid">
          {resource.yields && Object.entries(resource.yields).map(([type, amount]) => (
            <div key={type} className="stat-card small">
              <span className="stat-value">+{amount}</span>
              <span className="stat-unit">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </div>
          ))}
          {resource.happinessBonus && (
            <div className="stat-card small">
              <span className="stat-value">+{resource.happinessBonus}</span>
              <span className="stat-unit">Happiness</span>
            </div>
          )}
          {resource.healthBonus && (
            <div className="stat-card small">
              <span className="stat-value">+{resource.healthBonus}</span>
              <span className="stat-unit">Health</span>
            </div>
          )}
        </div>
      )}

      <div className="details-section">
        <h3 className="section-title">Technology</h3>
        <div className="info-grid">
          {resource.revealTech && (
            <div className="info-row">
              <span className="info-label">Revealed By</span>
              <span className="info-value">{resource.revealTech}</span>
            </div>
          )}
          {resource.connectTech && (
            <div className="info-row">
              <span className="info-label">Connected By</span>
              <span className="info-value">{resource.connectTech}</span>
            </div>
          )}
        </div>
      </div>

      <div className="details-section">
        <p className="description-text">{resource.description}</p>
      </div>

      {resource.enabledUnits && resource.enabledUnits.length > 0 && (
        <div className="details-section">
          <h3 className="section-title">Enabled Units</h3>
          <ul className="feature-list">
            {resource.enabledUnits.map((unit, idx) => (
              <li key={idx}>{unit}</li>
            ))}
          </ul>
        </div>
      )}

      {resource.enabledBuildings && resource.enabledBuildings.length > 0 && (
        <div className="details-section">
          <h3 className="section-title">Enabled Buildings</h3>
          <ul className="feature-list">
            {resource.enabledBuildings.map((building, idx) => (
              <li key={idx}>{building}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderTerrainDetails = (terrain) => (
    <div className="item-details">
      <header className="details-header">
        <div className="header-with-icon">
          {terrain.svgIcon && (
            <div className="header-icon" dangerouslySetInnerHTML={{ __html: terrain.svgIcon }} />
          )}
          <div>
            <h2>{terrain.name}</h2>
            <p className="item-category-tag">{terrain.category}</p>
          </div>
        </div>
      </header>

      <div className="stats-grid">
        {terrain.baseYields && Object.entries(terrain.baseYields).map(([type, amount]) => (
          <div key={type} className="stat-card small">
            <span className="stat-value">+{amount}</span>
            <span className="stat-unit">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </div>
        ))}
        <div className="stat-card small">
          <span className="stat-value">{terrain.movementCost === Infinity ? '∞' : terrain.movementCost}</span>
          <span className="stat-unit">Movement</span>
        </div>
        {terrain.defenseBonus > 0 && (
          <div className="stat-card small">
            <span className="stat-value">+{terrain.defenseBonus}%</span>
            <span className="stat-unit">Defense</span>
          </div>
        )}
      </div>

      {terrain.healthPenalty && (
        <div className="details-section">
          <div className="warning-badge">
            Health Penalty: {terrain.healthPenalty}
          </div>
        </div>
      )}

      <div className="details-section">
        <p className="description-text">{terrain.description}</p>
      </div>

      {terrain.canBeClearedForProduction && (
        <div className="details-section">
          <h3 className="section-title">Special</h3>
          <ul className="feature-list">
            <li>Can be cleared for {terrain.productionFromClearing} instant production</li>
          </ul>
        </div>
      )}
    </div>
  );

  const renderImprovementDetails = (improvement) => (
    <div className="item-details">
      <header className="details-header">
        <div className="header-with-icon">
          {improvement.svgIcon && (
            <div className="header-icon" dangerouslySetInnerHTML={{ __html: improvement.svgIcon }} />
          )}
          <div>
            <h2>{improvement.name}</h2>
            <p className="item-category-tag">{improvement.category}</p>
          </div>
        </div>
      </header>

      <div className="stats-grid">
        {improvement.yields && Object.entries(improvement.yields).map(([type, amount]) => (
          <div key={type} className="stat-card small">
            <span className="stat-value">+{amount}</span>
            <span className="stat-unit">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
          </div>
        ))}
        {improvement.buildTime && (
          <div className="stat-card small">
            <span className="stat-value">{improvement.buildTime}</span>
            <span className="stat-unit">Turns</span>
          </div>
        )}
        {improvement.defenseBonus && (
          <div className="stat-card small">
            <span className="stat-value">+{improvement.defenseBonus}%</span>
            <span className="stat-unit">Defense</span>
          </div>
        )}
      </div>

      {improvement.requiredTech && (
        <div className="details-section">
          <h3 className="section-title">Requirements</h3>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Technology</span>
              <span className="info-value">{improvement.requiredTech}</span>
            </div>
          </div>
        </div>
      )}

      <div className="details-section">
        <p className="description-text">{improvement.description}</p>
      </div>

      {improvement.improvesResources && improvement.improvesResources.length > 0 && (
        <div className="details-section">
          <h3 className="section-title">Improves Resources</h3>
          <ul className="feature-list">
            {improvement.improvesResources.map((resource, idx) => (
              <li key={idx}>{resource}</li>
            ))}
          </ul>
        </div>
      )}

      {improvement.bonusYieldsWithTech && (
        <div className="details-section">
          <h3 className="section-title">Bonus Yields</h3>
          <ul className="feature-list">
            {Object.entries(improvement.bonusYieldsWithTech).map(([tech, bonus], idx) => (
              <li key={idx}>
                <strong>{tech}:</strong>{' '}
                {Object.entries(bonus)
                  .filter(([key]) => key !== 'condition')
                  .map(([type, amount]) => `+${amount} ${type}`)
                  .join(', ')}
                {bonus.condition && <em> ({bonus.condition})</em>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderItemDetails = (item) => {
    if (!item) return (
      <div className="empty-state">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p>Select an entry to view details</p>
      </div>
    );

    switch (selectedCategory) {
      case 'yields':
        return renderYieldDetails(item);
      case 'resources':
        return renderResourceDetails(item);
      case 'terrain':
        return renderTerrainDetails(item);
      case 'improvements':
        return renderImprovementDetails(item);
      case 'units':
        return renderUnitDetails(item);
      case 'technologies':
        return renderTechnologyDetails(item);
      case 'buildings':
        return renderBuildingDetails(item);
      case 'civilizations':
        return renderCivilizationDetails(item);
      case 'leaders':
        return renderLeaderDetails(item);
      default:
        return null;
    }
  };

  return (
    <div className="civilopedia">
      {/* Header */}
      <header className="civilopedia-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Main Menu</span>
        </button>
        <div className="header-title">
          <h1>Civilopedia</h1>
          <p className="header-subtitle">Encyclopedia of Civilization</p>
        </div>
        <div className="header-spacer" />
      </header>

      <div className="civilopedia-content">
        {/* Left Sidebar - Categories */}
        <aside className="category-sidebar">
          <nav className="category-nav" role="navigation" aria-label="Categories">
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                className={`category-button ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-name">{cat.name}</span>
                <span className="category-count">{cat.data.length}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Middle Sidebar - Items */}
        {selectedCategory && (
          <aside className="items-sidebar">
            <div className="search-container">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder={`Search ${currentCategory.name}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear" onClick={() => setSearchTerm('')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            <div className="items-list">
              {filteredData.map((item, idx) => (
                <button
                  key={item.id || idx}
                  className={`item-card ${selectedItem?.id === item.id ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(item)}
                  style={{ animationDelay: `${idx * 0.03}s` }}
                >
                  <span className="item-name">{item.name}</span>
                  {item.category && <span className="item-tag">{item.category}</span>}
                  {item.era && <span className="item-tag">{item.era}</span>}
                  {item.isUnique && <span className="item-unique-indicator" />}
                </button>
              ))}
              {filteredData.length === 0 && (
                <div className="no-results">
                  <p>No entries found</p>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="main-content">
          {!selectedCategory ? (
            <div className="welcome-state">
              <div className="welcome-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2>Welcome to the Civilopedia</h2>
              <p>Select a category from the left to explore the knowledge of civilizations</p>
              <div className="category-preview">
                {categories.slice(0, 4).map(cat => (
                  <button
                    key={cat.id}
                    className="preview-card"
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    <span className="preview-icon">{cat.icon}</span>
                    <span className="preview-name">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            renderItemDetails(selectedItem)
          )}
        </main>
      </div>
    </div>
  );
};

export default Civilopedia;
