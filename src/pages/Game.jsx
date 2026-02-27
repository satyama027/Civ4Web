import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateMap, getMapStats, TERRAIN } from '../game/mapGenerator';
import { createScene } from '../game/babylon/BabylonScene';
import { TERRAIN_RGB, createTerrainMaterial } from '../game/babylon/TerrainMaterials';
import { buildTerrainMesh, buildGridOverlay } from '../game/babylon/TerrainBuilder';
import { setupTilePicking } from '../game/babylon/TilePicker';
import { buildFeatures } from '../game/babylon/FeatureRenderer';
import { setupEdgeScrolling } from '../game/babylon/EdgeScroller';
import '../styles/Game.css';

// Legend colors matching terrain materials
const TERRAIN_LEGEND = {
  [TERRAIN.OCEAN]: '#1a4a7a',
  [TERRAIN.COAST]: '#3a8ab0',
  [TERRAIN.GRASSLAND]: '#4a9a4a',
  [TERRAIN.PLAINS]: '#b8a060',
  [TERRAIN.DESERT]: '#e8d0a0',
  [TERRAIN.TUNDRA]: '#9aacac',
  [TERRAIN.SNOW]: '#f0f0f0',
};

const Game = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const babylonRef = useRef(null);

  // Game state
  const [mapData, setMapData] = useState(null);
  const [mapStats, setMapStats] = useState(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState(null);

  // View state
  const [hoveredTile, setHoveredTile] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showRivers, setShowRivers] = useState(true);

  // Get game settings from navigation state
  const gameSettings = location.state || {
    mapType: 'continents',
    mapSize: 'small',
    climate: 'temperate',
    seaLevel: 'medium',
    numOpponents: 3
  };

  // Generate map on mount
  useEffect(() => {
    const generate = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        await new Promise(resolve => setTimeout(resolve, 100));

        const seed = Date.now();
        console.log('Generating map with settings:', gameSettings);

        const map = generateMap({
          mapType: gameSettings.mapType,
          mapSize: gameSettings.mapSize,
          climate: gameSettings.climate,
          seaLevel: gameSettings.seaLevel,
          numPlayers: (gameSettings.numOpponents || 3) + 1,
          seed
        });

        const stats = getMapStats(map);
        setMapData(map);
        setMapStats(stats);
        console.log('Map generated:', stats);
      } catch (err) {
        console.error('Map generation failed:', err);
        setError(err.message);
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize Babylon.js scene when mapData is ready
  useEffect(() => {
    if (!mapData || !canvasRef.current) return;

    const canvas = canvasRef.current;

    const babylon = createScene(canvas, mapData);
    const material = createTerrainMaterial(babylon.scene, mapData);
    const { mesh, positions } = buildTerrainMesh(babylon.scene, mapData, TERRAIN_RGB, material);
    // Store mesh reference so shader material can swap in when textures load
    if (material._shaderMat) {
      material._shaderMat._terrainMesh = mesh;
    }
    buildGridOverlay(babylon.scene, mapData, positions);
    const features = buildFeatures(babylon.scene, mapData, positions);

    const picker = setupTilePicking(
      babylon.scene,
      canvas,
      mapData,
      positions,
      (tile) => setHoveredTile(tile),
      () => {} // onClick: future use
    );

    const edgeScroller = setupEdgeScrolling(babylon.scene, canvas, babylon.camera, mapData);

    babylonRef.current = { ...babylon, features, picker, edgeScroller };

    const rafId = requestAnimationFrame(() => {
      if (babylonRef.current) babylonRef.current.resetCamera();
    });

    const ro = new ResizeObserver(() => {
      babylon.engine.resize();
      babylon.resetCamera();
    });
    ro.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      edgeScroller.dispose();
      picker.dispose();
      features.dispose();
      babylon.dispose();
      babylonRef.current = null;
    };
  }, [mapData]);

  // Toggle grid overlay
  useEffect(() => {
    if (!babylonRef.current) return;
    const grid = babylonRef.current.scene.getMeshByName('gridOverlay');
    if (grid) grid.isVisible = showGrid;
  }, [showGrid]);

  // Toggle rivers
  useEffect(() => {
    if (!babylonRef.current) return;
    const rivers = babylonRef.current.scene.getMeshByName('rivers');
    if (rivers) rivers.isVisible = showRivers;
  }, [showRivers]);

  // Get hovered tile info
  const hoveredTileInfo = hoveredTile && mapData ? mapData.getTile(hoveredTile.x, hoveredTile.y) : null;

  // Regenerate map
  const handleRegenerate = () => {
    if (babylonRef.current) {
      if (babylonRef.current.edgeScroller) babylonRef.current.edgeScroller.dispose();
      if (babylonRef.current.picker) babylonRef.current.picker.dispose();
      if (babylonRef.current.features) babylonRef.current.features.dispose();
      babylonRef.current.dispose();
      babylonRef.current = null;
    }
    setMapData(null);
    setHoveredTile(null);
    setIsGenerating(true);
    setTimeout(() => {
      const seed = Date.now();
      try {
        const map = generateMap({
          mapType: gameSettings.mapType,
          mapSize: gameSettings.mapSize,
          climate: gameSettings.climate,
          seaLevel: gameSettings.seaLevel,
          numPlayers: (gameSettings.numOpponents || 3) + 1,
          seed
        });
        setMapData(map);
        setMapStats(getMapStats(map));
      } catch (err) {
        setError(err.message);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  return (
    <div className="game-container">
      {/* Header */}
      <header className="game-header">
        <button className="back-button" onClick={() => navigate('/new-game')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back</span>
        </button>
        <h1>Map Preview (3D)</h1>
        <div className="header-controls">
          <button onClick={handleRegenerate} disabled={isGenerating}>
            Regenerate
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="game-content">
        {/* Map canvas */}
        <div className="map-container" ref={containerRef}>
          {isGenerating ? (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <p>Generating map...</p>
            </div>
          ) : error ? (
            <div className="error-overlay">
              <p>Error: {error}</p>
              <button onClick={handleRegenerate}>Try Again</button>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="map-canvas"
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="game-sidebar">
          {/* Controls */}
          <section className="sidebar-section">
            <h3>View Controls</h3>
            <p className="control-hint">
              Left-click + drag: Rotate | Right-click + drag: Pan | Scroll: Zoom
            </p>
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Show Grid
              </label>
            </div>
            <div className="control-group">
              <label>
                <input
                  type="checkbox"
                  checked={showRivers}
                  onChange={(e) => setShowRivers(e.target.checked)}
                />
                Show Rivers
              </label>
            </div>
          </section>

          {/* Map Stats */}
          {mapStats && (
            <section className="sidebar-section">
              <h3>Map Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Size</span>
                  <span className="stat-value">{mapStats.dimensions}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Land</span>
                  <span className="stat-value">{mapStats.landPercent}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Water</span>
                  <span className="stat-value">{mapStats.waterPercent}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Hills</span>
                  <span className="stat-value">{mapStats.hillsPercent}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Peaks</span>
                  <span className="stat-value">{mapStats.peaksPercent}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Starts</span>
                  <span className="stat-value">{mapStats.startingLocations}</span>
                </div>
              </div>
            </section>
          )}

          {/* Hovered Tile Info */}
          {hoveredTileInfo && (
            <section className="sidebar-section tile-info">
              <h3>Tile Info</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Position</span>
                  <span className="stat-value">({hoveredTile.x}, {hoveredTile.y})</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Terrain</span>
                  <span className="stat-value">{hoveredTileInfo.terrain}</span>
                </div>
                {hoveredTileInfo.isHills && (
                  <div className="stat-item">
                    <span className="stat-label">Elevation</span>
                    <span className="stat-value">Hills</span>
                  </div>
                )}
                {hoveredTileInfo.isPeak && (
                  <div className="stat-item">
                    <span className="stat-label">Elevation</span>
                    <span className="stat-value">Peak</span>
                  </div>
                )}
                {hoveredTileInfo.feature && (
                  <div className="stat-item">
                    <span className="stat-label">Feature</span>
                    <span className="stat-value">{hoveredTileInfo.feature}</span>
                  </div>
                )}
                {hoveredTileInfo.resource && (
                  <div className="stat-item">
                    <span className="stat-label">Resource</span>
                    <span className="stat-value">{hoveredTileInfo.resource}</span>
                  </div>
                )}
                {hoveredTileInfo.hasRiver && (
                  <div className="stat-item">
                    <span className="stat-label">River</span>
                    <span className="stat-value">Yes</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Legend */}
          <section className="sidebar-section">
            <h3>Legend</h3>
            <div className="legend">
              {Object.entries(TERRAIN_LEGEND).map(([terrain, color]) => (
                <div key={terrain} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: color }} />
                  <span className="legend-label">{terrain}</span>
                </div>
              ))}
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#606060' }} />
                <span className="legend-label">Peak</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Game;
