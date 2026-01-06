import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { units } from '../data/units';
import { technologies } from '../data/technologies';
import { buildings } from '../data/buildings';
import { civilizations } from '../data/civilizations';
import { leaders, leaderTraits } from '../data/leaders';
import '../styles/Civilopedia.css';

const Civilopedia = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('units');
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'units', name: 'Units', data: units },
    { id: 'technologies', name: 'Technologies', data: technologies },
    { id: 'buildings', name: 'Buildings', data: buildings },
    { id: 'civilizations', name: 'Civilizations', data: civilizations },
    { id: 'leaders', name: 'Leaders', data: leaders }
  ];

  const navigateToItem = (categoryId, itemName) => {
    setSelectedCategory(categoryId);
    const category = categories.find(c => c.id === categoryId);
    const item = category.data.find(i => i.name === itemName || i.uniqueUnit === itemName || i.uniqueBuilding === itemName);
    if (item) {
      setSelectedItem(item);
    }
  };

  const currentCategory = categories.find(c => c.id === selectedCategory);
  const filteredData = currentCategory.data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderUnitDetails = (unit) => (
    <div className="item-details">
      <h2>{unit.name} {unit.isUnique && <span className="unique-badge">Unique</span>}</h2>
      <div className="details-grid">
        <div className="detail-row">
          <span className="label">Category:</span>
          <span className="value">{unit.category}</span>
        </div>
        <div className="detail-row">
          <span className="label">Cost:</span>
          <span className="value">{unit.cost} Production</span>
        </div>
        <div className="detail-row">
          <span className="label">Strength:</span>
          <span className="value">{unit.strength}</span>
        </div>
        <div className="detail-row">
          <span className="label">Movement:</span>
          <span className="value">{unit.movement}</span>
        </div>
        {unit.requiredTech && (
          <div className="detail-row">
            <span className="label">Required Tech:</span>
            <span className="value">{unit.requiredTech}</span>
          </div>
        )}
        {unit.civilization && (
          <div className="detail-row">
            <span className="label">Civilization:</span>
            <span className="value clickable" onClick={() => navigateToItem('civilizations', unit.civilization)}>
              {unit.civilization}
            </span>
          </div>
        )}
        {unit.replaces && (
          <div className="detail-row">
            <span className="label">Replaces:</span>
            <span className="value">{unit.replaces}</span>
          </div>
        )}
        {unit.abilities && unit.abilities.length > 0 && (
          <div className="detail-row">
            <span className="label">Abilities:</span>
            <span className="value">{unit.abilities.join(', ')}</span>
          </div>
        )}
      </div>
      <div className="description">
        <h3>Description</h3>
        <p>{unit.description}</p>
      </div>
    </div>
  );

  const renderTechnologyDetails = (tech) => (
    <div className="item-details">
      <h2>{tech.name}</h2>
      <div className="details-grid">
        <div className="detail-row">
          <span className="label">Era:</span>
          <span className="value">{tech.era}</span>
        </div>
        <div className="detail-row">
          <span className="label">Cost:</span>
          <span className="value">{tech.cost} Research</span>
        </div>
      </div>
      <div className="description">
        <h3>Unlocks</h3>
        <ul>
          {tech.unlocks.map((unlock, idx) => (
            <li key={idx}>{unlock}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderBuildingDetails = (building) => (
    <div className="item-details">
      <h2>{building.name} {building.isUnique && <span className="unique-badge">Unique</span>}</h2>
      <div className="details-grid">
        <div className="detail-row">
          <span className="label">Category:</span>
          <span className="value">{building.category}</span>
        </div>
        <div className="detail-row">
          <span className="label">Cost:</span>
          <span className="value">{building.cost} Production</span>
        </div>
        {building.tech && (
          <div className="detail-row">
            <span className="label">Required Tech:</span>
            <span className="value">{building.tech}</span>
          </div>
        )}
        {building.civilization && (
          <div className="detail-row">
            <span className="label">Civilization:</span>
            <span className="value clickable" onClick={() => navigateToItem('civilizations', building.civilization)}>
              {building.civilization}
            </span>
          </div>
        )}
        {building.replaces && (
          <div className="detail-row">
            <span className="label">Replaces:</span>
            <span className="value">{building.replaces}</span>
          </div>
        )}
      </div>
      <div className="description">
        <h3>Effects</h3>
        <ul>
          {building.effects.map((effect, idx) => (
            <li key={idx}>{effect}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderCivilizationDetails = (civ) => (
    <div className="item-details">
      <h2>{civ.name}</h2>
      <div className="details-grid">
        <div className="detail-row">
          <span className="label">Unique Unit:</span>
          <span className="value clickable" onClick={() => navigateToItem('units', civ.uniqueUnit)}>
            {civ.uniqueUnit}
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Unique Building:</span>
          <span className="value clickable" onClick={() => navigateToItem('buildings', civ.uniqueBuilding)}>
            {civ.uniqueBuilding}
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Starting Techs:</span>
          <span className="value">{civ.startingTechs.join(', ')}</span>
        </div>
      </div>
      <div className="description">
        <h3>Leaders</h3>
        {civ.leaders.map((leader, idx) => (
          <div key={idx} className="leader-info">
            <h4 className="clickable" onClick={() => navigateToItem('leaders', leader.name)}>{leader.name}</h4>
            <p><strong>Traits:</strong> {leader.traits.join(', ')}</p>
            {leader.traits.map((trait, tidx) => (
              <p key={tidx} className="trait-description">
                <strong>{trait}:</strong> {leaderTraits[trait]}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const renderLeaderDetails = (leader) => (
    <div className="item-details">
      <h2>{leader.name}</h2>
      <div className="details-grid">
        <div className="detail-row">
          <span className="label">Civilization:</span>
          <span className="value clickable" onClick={() => navigateToItem('civilizations', leader.civilization)}>
            {leader.civilization}
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Favorite Civic:</span>
          <span className="value">{leader.favoriteCivic}</span>
        </div>
      </div>
      <div className="description">
        <h3>Leader Traits</h3>
        {leader.traits.map((trait, idx) => (
          <div key={idx} className="leader-trait">
            <h4>{trait}</h4>
            <p>{leaderTraits[trait]}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderItemDetails = (item) => {
    if (!item) return <div className="no-selection">Select an item to view details</div>;

    switch (selectedCategory) {
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
      <div className="civilopedia-header">
        <button className="back-button" onClick={() => navigate('/')}>
          Back to Main Menu
        </button>
        <h1>Civilopedia</h1>
      </div>

      <div className="civilopedia-content">
        <div className="sidebar">
          <div className="category-nav">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-button ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedItem(null);
                  setSearchTerm('');
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder={`Search ${currentCategory.name}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="item-list">
            {filteredData.map((item, idx) => (
              <div
                key={idx}
                className={`item-card ${selectedItem?.id === item.id ? 'selected' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="item-name">{item.name}</div>
                {item.category && <div className="item-subtitle">{item.category}</div>}
                {item.era && <div className="item-subtitle">{item.era} Era</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="main-content">
          {renderItemDetails(selectedItem)}
        </div>
      </div>
    </div>
  );
};

export default Civilopedia;
