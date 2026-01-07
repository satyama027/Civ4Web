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
    { id: 'yields', name: 'Yields', data: yields },
    { id: 'resources', name: 'Resources', data: resources },
    { id: 'terrain', name: 'Terrain Types', data: terrainTypes },
    { id: 'improvements', name: 'Improvements', data: improvements },
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

  const renderYieldDetails = (yield_item) => (
    <div className="item-details">
      <div className="yield-header">
        <h2>{yield_item.icon} {yield_item.name}</h2>
        {yield_item.svgIcon && (
          <div className="yield-image-container" dangerouslySetInnerHTML={{ __html: yield_item.svgIcon }} />
        )}
      </div>
      <div className="description">
        <p className="yield-description">{yield_item.description}</p>

        <h3>Sources</h3>
        <ul className="yield-list">
          {yield_item.sources.map((source, idx) => (
            <li key={idx}>{source}</li>
          ))}
        </ul>

        <h3>Game Mechanics</h3>
        <ul className="yield-list">
          {yield_item.mechanics.map((mechanic, idx) => (
            <li key={idx}>{mechanic}</li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderResourceDetails = (resource) => (
    <div className="item-details">
      <div className="yield-header">
        <h2>{resource.icon} {resource.name}</h2>
        {resource.svgIcon && (
          <div className="yield-image-container" dangerouslySetInnerHTML={{ __html: resource.svgIcon }} />
        )}
      </div>
      <div className="details-grid">
        <div className="detail-row">
          <span className="label">Category:</span>
          <span className="value">{resource.category}</span>
        </div>
        {resource.yields && Object.keys(resource.yields).length > 0 && (
          <div className="detail-row">
            <span className="label">Yields:</span>
            <span className="value">
              {Object.entries(resource.yields).map(([type, amount]) =>
                `+${amount} ${type.charAt(0).toUpperCase() + type.slice(1)}`
              ).join(', ')}
            </span>
          </div>
        )}
        {resource.revealTech && (
          <div className="detail-row">
            <span className="label">Reveal Tech:</span>
            <span className="value">{resource.revealTech}</span>
          </div>
        )}
        {resource.connectTech && (
          <div className="detail-row">
            <span className="label">Connect Tech:</span>
            <span className="value">{resource.connectTech}</span>
          </div>
        )}
        {resource.happinessBonus && (
          <div className="detail-row">
            <span className="label">Happiness:</span>
            <span className="value">+{resource.happinessBonus}</span>
          </div>
        )}
        {resource.healthBonus && (
          <div className="detail-row">
            <span className="label">Health:</span>
            <span className="value">+{resource.healthBonus}</span>
          </div>
        )}
      </div>
      <div className="description">
        <p className="yield-description">{resource.description}</p>
        {resource.enabledUnits && resource.enabledUnits.length > 0 && (
          <>
            <h3>Enabled Units</h3>
            <ul className="yield-list">
              {resource.enabledUnits.map((unit, idx) => (
                <li key={idx}>{unit}</li>
              ))}
            </ul>
          </>
        )}
        {resource.enabledBuildings && resource.enabledBuildings.length > 0 && (
          <>
            <h3>Enabled Buildings</h3>
            <ul className="yield-list">
              {resource.enabledBuildings.map((building, idx) => (
                <li key={idx}>{building}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );

  const renderTerrainDetails = (terrain) => (
    <div className="item-details">
      <div className="yield-header">
        <h2>{terrain.icon} {terrain.name}</h2>
        {terrain.svgIcon && (
          <div className="yield-image-container" dangerouslySetInnerHTML={{ __html: terrain.svgIcon }} />
        )}
      </div>
      <div className="details-grid">
        <div className="detail-row">
          <span className="label">Category:</span>
          <span className="value">{terrain.category}</span>
        </div>
        {terrain.baseYields && Object.keys(terrain.baseYields).length > 0 && (
          <div className="detail-row">
            <span className="label">Base Yields:</span>
            <span className="value">
              {Object.entries(terrain.baseYields).map(([type, amount]) =>
                `+${amount} ${type.charAt(0).toUpperCase() + type.slice(1)}`
              ).join(', ')}
            </span>
          </div>
        )}
        <div className="detail-row">
          <span className="label">Movement Cost:</span>
          <span className="value">{terrain.movementCost === Infinity ? 'Impassable' : terrain.movementCost}</span>
        </div>
        {terrain.defenseBonus > 0 && (
          <div className="detail-row">
            <span className="label">Defense Bonus:</span>
            <span className="value">+{terrain.defenseBonus}%</span>
          </div>
        )}
        {terrain.healthPenalty && (
          <div className="detail-row">
            <span className="label">Health:</span>
            <span className="value">{terrain.healthPenalty}</span>
          </div>
        )}
      </div>
      <div className="description">
        <p className="yield-description">{terrain.description}</p>
        {terrain.canBeClearedForProduction && (
          <ul className="yield-list">
            <li>Can be cleared for {terrain.productionFromClearing} instant production</li>
          </ul>
        )}
      </div>
    </div>
  );

  const renderImprovementDetails = (improvement) => (
    <div className="item-details">
      <div className="yield-header">
        <h2>{improvement.icon} {improvement.name}</h2>
        {improvement.svgIcon && (
          <div className="yield-image-container" dangerouslySetInnerHTML={{ __html: improvement.svgIcon }} />
        )}
      </div>
      <div className="details-grid">
        <div className="detail-row">
          <span className="label">Category:</span>
          <span className="value">{improvement.category}</span>
        </div>
        {improvement.yields && Object.keys(improvement.yields).length > 0 && (
          <div className="detail-row">
            <span className="label">Yields:</span>
            <span className="value">
              {Object.entries(improvement.yields).map(([type, amount]) =>
                `+${amount} ${type.charAt(0).toUpperCase() + type.slice(1)}`
              ).join(', ')}
            </span>
          </div>
        )}
        {improvement.requiredTech && (
          <div className="detail-row">
            <span className="label">Required Tech:</span>
            <span className="value">{improvement.requiredTech}</span>
          </div>
        )}
        {improvement.buildTime && (
          <div className="detail-row">
            <span className="label">Build Time:</span>
            <span className="value">{improvement.buildTime} turns</span>
          </div>
        )}
        {improvement.defenseBonus && (
          <div className="detail-row">
            <span className="label">Defense Bonus:</span>
            <span className="value">+{improvement.defenseBonus}%</span>
          </div>
        )}
      </div>
      <div className="description">
        <p className="yield-description">{improvement.description}</p>
        {improvement.improvesResources && improvement.improvesResources.length > 0 && (
          <>
            <h3>Improves Resources</h3>
            <ul className="yield-list">
              {improvement.improvesResources.map((resource, idx) => (
                <li key={idx}>{resource}</li>
              ))}
            </ul>
          </>
        )}
        {improvement.bonusYieldsWithTech && (
          <>
            <h3>Bonus Yields</h3>
            <ul className="yield-list">
              {Object.entries(improvement.bonusYieldsWithTech).map(([tech, bonus], idx) => (
                <li key={idx}>
                  {tech}: {Object.entries(bonus)
                    .filter(([key]) => key !== 'condition')
                    .map(([type, amount]) => `+${amount} ${type}`)
                    .join(', ')}
                  {bonus.condition && ` (${bonus.condition})`}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );

  const renderItemDetails = (item) => {
    if (!item) return <div className="no-selection">Select an item to view details</div>;

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
      <div className="civilopedia-header">
        <button className="back-button" onClick={() => navigate('/')}>
          Back to Main Menu
        </button>
        <h1>Civilopedia</h1>
      </div>

      <div className="civilopedia-content">
        {/* Left Sidebar - Categories */}
        <div className="category-sidebar">
          <div className="category-nav">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-button ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Middle Sidebar - Items (only shows when category is selected) */}
        {selectedCategory && (
          <div className="items-sidebar">
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
        )}

        {/* Right Content - Item Details */}
        <div className="main-content">
          {!selectedCategory ? (
            <div className="no-selection">Select a category from the left to begin</div>
          ) : (
            renderItemDetails(selectedItem)
          )}
        </div>
      </div>
    </div>
  );
};

export default Civilopedia;
