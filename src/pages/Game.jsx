import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateMap, getMapStats, TERRAIN, FEATURE } from '../game/mapGenerator';
import '../styles/Game.css';

// Isometric tile dimensions (2:1 ratio)
const ISO_TILE_WIDTH = 128;
const ISO_TILE_HEIGHT = 64;

// Threshold for switching between isometric and top-down view
const ISO_VIEW_THRESHOLD = 48;

// Terrain colors for isometric 3D-style rendering
const TERRAIN_STYLES = {
  [TERRAIN.OCEAN]: {
    top: '#1a4a7a',
    light: '#2a6a9a',
    dark: '#0a2a4a',
    accent: '#3a8aca'
  },
  [TERRAIN.COAST]: {
    top: '#3a8ab0',
    light: '#5aaad0',
    dark: '#2a6a90',
    accent: '#7acaf0'
  },
  [TERRAIN.GRASSLAND]: {
    top: '#4a9a4a',
    light: '#5aba5a',
    dark: '#2a6a2a',
    accent: '#7ada7a'
  },
  [TERRAIN.PLAINS]: {
    top: '#b8a060',
    light: '#d8c080',
    dark: '#887040',
    accent: '#e8d0a0'
  },
  [TERRAIN.DESERT]: {
    top: '#e8d0a0',
    light: '#f8e8c0',
    dark: '#c8a870',
    accent: '#fff0d0'
  },
  [TERRAIN.TUNDRA]: {
    top: '#9aacac',
    light: '#baccc0',
    dark: '#6a8080',
    accent: '#cae0dc'
  },
  [TERRAIN.SNOW]: {
    top: '#f0f0f0',
    light: '#ffffff',
    dark: '#c0c0c0',
    accent: '#ffffff'
  }
};

// Feature styles
const FEATURE_STYLES = {
  [FEATURE.FOREST]: { base: '#2a5a2a', highlight: '#3a7a3a', trunk: '#4a3020' },
  [FEATURE.JUNGLE]: { base: '#1a4a1a', highlight: '#2a6a2a', trunk: '#3a2010' },
  [FEATURE.OASIS]: { water: '#40b0a0', palm: '#3a7a3a', trunk: '#6a5030' },
  [FEATURE.FLOODPLAINS]: { base: '#7ab050', highlight: '#9ad070' }
};

const Game = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Game state
  const [mapData, setMapData] = useState(null);
  const [mapStats, setMapStats] = useState(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState(null);

  // View state
  const [zoom, setZoom] = useState(1.0); // 1.0 = default isometric, <0.4 = top-down
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showResources, setShowResources] = useState(true);
  const [showRivers, setShowRivers] = useState(true);

  // Derived: is isometric view active?
  const isIsometric = zoom >= 0.4;
  const tileWidth = isIsometric ? ISO_TILE_WIDTH * zoom : ISO_TILE_HEIGHT * zoom * 0.5;
  const tileHeight = isIsometric ? ISO_TILE_HEIGHT * zoom : ISO_TILE_HEIGHT * zoom * 0.5;

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

        // Center the map initially
        if (containerRef.current) {
          const container = containerRef.current;
          setOffset({
            x: container.clientWidth / 2,
            y: 100
          });
        }

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

  // Convert world coordinates to screen coordinates (isometric)
  const worldToScreenIso = useCallback((tileX, tileY) => {
    const screenX = (tileX - tileY) * (tileWidth / 2) + offset.x;
    const screenY = (tileX + tileY) * (tileHeight / 2) + offset.y;
    return { x: screenX, y: screenY };
  }, [tileWidth, tileHeight, offset]);

  // Convert world coordinates to screen coordinates (top-down)
  const worldToScreenFlat = useCallback((tileX, tileY) => {
    const screenX = tileX * tileWidth + offset.x;
    const screenY = tileY * tileHeight + offset.y;
    return { x: screenX, y: screenY };
  }, [tileWidth, tileHeight, offset]);

  // Convert screen to world coordinates (isometric)
  const screenToWorldIso = useCallback((screenX, screenY) => {
    const x = screenX - offset.x;
    const y = screenY - offset.y;
    const tileX = Math.floor((x / (tileWidth / 2) + y / (tileHeight / 2)) / 2);
    const tileY = Math.floor((y / (tileHeight / 2) - x / (tileWidth / 2)) / 2);
    return { x: tileX, y: tileY };
  }, [tileWidth, tileHeight, offset]);

  // Convert screen to world coordinates (top-down)
  const screenToWorldFlat = useCallback((screenX, screenY) => {
    const tileX = Math.floor((screenX - offset.x) / tileWidth);
    const tileY = Math.floor((screenY - offset.y) / tileHeight);
    return { x: tileX, y: tileY };
  }, [tileWidth, tileHeight, offset]);

  // Draw isometric diamond tile
  const drawIsometricTile = useCallback((ctx, screenX, screenY, tile, w, h) => {
    const style = TERRAIN_STYLES[tile.terrain] || TERRAIN_STYLES[TERRAIN.GRASSLAND];
    const heightBonus = tile.isHills ? h * 0.15 : tile.isPeak ? h * 0.35 : 0;

    // Draw tile base (3D effect with sides)
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - heightBonus); // Top
    ctx.lineTo(screenX + w / 2, screenY + h / 2 - heightBonus); // Right
    ctx.lineTo(screenX, screenY + h - heightBonus); // Bottom
    ctx.lineTo(screenX - w / 2, screenY + h / 2 - heightBonus); // Left
    ctx.closePath();

    // Top face gradient
    const topGrad = ctx.createLinearGradient(screenX - w/2, screenY, screenX + w/2, screenY + h);
    topGrad.addColorStop(0, style.light);
    topGrad.addColorStop(0.5, style.top);
    topGrad.addColorStop(1, style.dark);
    ctx.fillStyle = topGrad;
    ctx.fill();

    // Draw left side (darker) for 3D effect
    if (heightBonus > 0 || tile.isWater === false) {
      const sideHeight = heightBonus > 0 ? heightBonus + 4 : 4;
      ctx.beginPath();
      ctx.moveTo(screenX - w / 2, screenY + h / 2 - heightBonus);
      ctx.lineTo(screenX, screenY + h - heightBonus);
      ctx.lineTo(screenX, screenY + h - heightBonus + sideHeight);
      ctx.lineTo(screenX - w / 2, screenY + h / 2 - heightBonus + sideHeight);
      ctx.closePath();
      ctx.fillStyle = style.dark;
      ctx.fill();

      // Right side (medium)
      ctx.beginPath();
      ctx.moveTo(screenX + w / 2, screenY + h / 2 - heightBonus);
      ctx.lineTo(screenX, screenY + h - heightBonus);
      ctx.lineTo(screenX, screenY + h - heightBonus + sideHeight);
      ctx.lineTo(screenX + w / 2, screenY + h / 2 - heightBonus + sideHeight);
      ctx.closePath();
      ctx.fillStyle = tile.terrain === TERRAIN.OCEAN || tile.terrain === TERRAIN.COAST
        ? style.dark
        : style.top;
      ctx.fill();
    }

    // Hills: draw bumps
    if (tile.isHills && w > 40) {
      ctx.fillStyle = style.dark;
      ctx.beginPath();
      ctx.ellipse(screenX - w * 0.15, screenY + h * 0.2 - heightBonus, w * 0.2, h * 0.15, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(screenX + w * 0.1, screenY + h * 0.35 - heightBonus, w * 0.18, h * 0.12, 0, Math.PI, 0);
      ctx.fill();

      // Highlights
      ctx.fillStyle = style.accent;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(screenX - w * 0.18, screenY + h * 0.15 - heightBonus, w * 0.1, h * 0.08, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Peaks: draw mountain
    if (tile.isPeak && w > 40) {
      // Mountain body
      ctx.fillStyle = '#606060';
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - heightBonus - h * 0.4);
      ctx.lineTo(screenX + w * 0.3, screenY + h * 0.2 - heightBonus);
      ctx.lineTo(screenX - w * 0.3, screenY + h * 0.2 - heightBonus);
      ctx.closePath();
      ctx.fill();

      // Snow cap
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - heightBonus - h * 0.4);
      ctx.lineTo(screenX + w * 0.12, screenY - heightBonus - h * 0.15);
      ctx.lineTo(screenX - w * 0.12, screenY - heightBonus - h * 0.15);
      ctx.closePath();
      ctx.fill();

      // Shadow side
      ctx.fillStyle = '#404040';
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - heightBonus - h * 0.4);
      ctx.lineTo(screenX - w * 0.3, screenY + h * 0.2 - heightBonus);
      ctx.lineTo(screenX, screenY + h * 0.1 - heightBonus);
      ctx.closePath();
      ctx.fill();
    }

    // Water animation effect
    if ((tile.terrain === TERRAIN.OCEAN || tile.terrain === TERRAIN.COAST) && w > 30) {
      ctx.fillStyle = style.accent;
      ctx.globalAlpha = 0.3;
      const waveOffset = (Date.now() / 1000) % 1;
      for (let i = 0; i < 3; i++) {
        const wy = screenY + h * 0.2 + i * h * 0.2;
        ctx.beginPath();
        ctx.ellipse(screenX + (waveOffset - 0.5) * w * 0.3, wy, w * 0.15, h * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }, []);

  // Draw forest/jungle trees
  const drawTrees = useCallback((ctx, screenX, screenY, w, h, isJungle) => {
    const style = isJungle ? FEATURE_STYLES[FEATURE.JUNGLE] : FEATURE_STYLES[FEATURE.FOREST];
    const treeCount = w > 80 ? 3 : 2;

    for (let i = 0; i < treeCount; i++) {
      const tx = screenX + (i - treeCount/2 + 0.5) * (w * 0.25);
      const ty = screenY + h * 0.1 + (i % 2) * h * 0.15;
      const treeH = h * 0.6;
      const treeW = w * 0.2;

      // Trunk
      ctx.fillStyle = style.trunk;
      ctx.fillRect(tx - treeW * 0.1, ty, treeW * 0.2, treeH * 0.3);

      // Foliage layers
      for (let layer = 0; layer < 3; layer++) {
        const layerY = ty - layer * treeH * 0.25;
        const layerW = treeW * (1 - layer * 0.2);
        ctx.fillStyle = layer === 0 ? style.base : style.highlight;
        ctx.beginPath();
        ctx.moveTo(tx, layerY - treeH * 0.3);
        ctx.lineTo(tx + layerW, layerY);
        ctx.lineTo(tx - layerW, layerY);
        ctx.closePath();
        ctx.fill();
      }
    }
  }, []);

  // Draw features (forests, jungle, oasis, etc.)
  const drawFeature = useCallback((ctx, screenX, screenY, tile, w, h) => {
    if (!tile.feature) return;

    if (tile.feature === FEATURE.FOREST && w > 30) {
      drawTrees(ctx, screenX, screenY - (tile.isHills ? h * 0.15 : 0), w, h, false);
    } else if (tile.feature === FEATURE.JUNGLE && w > 30) {
      drawTrees(ctx, screenX, screenY - (tile.isHills ? h * 0.15 : 0), w, h, true);
    } else if (tile.feature === FEATURE.OASIS && w > 30) {
      const style = FEATURE_STYLES[FEATURE.OASIS];
      // Water pool
      ctx.fillStyle = style.water;
      ctx.beginPath();
      ctx.ellipse(screenX, screenY + h * 0.3, w * 0.25, h * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      // Palm tree
      ctx.fillStyle = style.trunk;
      ctx.fillRect(screenX + w * 0.15 - 2, screenY - h * 0.1, 4, h * 0.4);
      ctx.fillStyle = style.palm;
      ctx.beginPath();
      ctx.ellipse(screenX + w * 0.15, screenY - h * 0.15, w * 0.15, h * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (tile.feature === FEATURE.FLOODPLAINS) {
      const style = FEATURE_STYLES[FEATURE.FLOODPLAINS];
      ctx.fillStyle = style.base;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + w / 2, screenY + h / 2);
      ctx.lineTo(screenX, screenY + h);
      ctx.lineTo(screenX - w / 2, screenY + h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [drawTrees]);

  // Draw river
  const drawRiver = useCallback((ctx, screenX, screenY, tile, w, h) => {
    if (!tile.hasRiver) return;

    const riverWidth = Math.max(3, w * 0.08);
    ctx.strokeStyle = '#4a90d9';
    ctx.lineWidth = riverWidth + 2;
    ctx.lineCap = 'round';

    // Draw river flowing through tile
    ctx.beginPath();
    ctx.moveTo(screenX - w * 0.1, screenY - h * 0.2);
    ctx.quadraticCurveTo(screenX, screenY + h * 0.2, screenX + w * 0.1, screenY + h * 0.5);
    ctx.stroke();

    // Highlight
    ctx.strokeStyle = '#7ab8f0';
    ctx.lineWidth = riverWidth;
    ctx.stroke();
  }, []);

  // Draw resource
  const drawResource = useCallback((ctx, screenX, screenY, tile, w, h) => {
    if (!tile.resource) return;

    const size = Math.max(8, w * 0.15);
    const ry = screenY + h * 0.15 - (tile.isHills ? h * 0.1 : 0);

    // Glow
    ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(screenX, ry, size + 4, 0, Math.PI * 2);
    ctx.fill();

    // Icon background
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenX, ry, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, []);

  // Draw top-down flat tile (for zoomed out view)
  const drawFlatTile = useCallback((ctx, screenX, screenY, tile, w, h) => {
    const style = TERRAIN_STYLES[tile.terrain] || TERRAIN_STYLES[TERRAIN.GRASSLAND];

    // Base terrain
    ctx.fillStyle = style.top;
    ctx.fillRect(screenX, screenY, w, h);

    // Hills shading
    if (tile.isHills) {
      ctx.fillStyle = 'rgba(60, 40, 20, 0.3)';
      ctx.fillRect(screenX, screenY, w, h);
    }

    // Peaks
    if (tile.isPeak) {
      ctx.fillStyle = '#606060';
      ctx.fillRect(screenX, screenY, w, h);
      if (w > 6) {
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(screenX + w/2, screenY + 2);
        ctx.lineTo(screenX + w - 2, screenY + h - 2);
        ctx.lineTo(screenX + 2, screenY + h - 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Features
    if (tile.feature === FEATURE.FOREST) {
      ctx.fillStyle = FEATURE_STYLES[FEATURE.FOREST].base;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(screenX, screenY, w, h);
      ctx.globalAlpha = 1;
    } else if (tile.feature === FEATURE.JUNGLE) {
      ctx.fillStyle = FEATURE_STYLES[FEATURE.JUNGLE].base;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(screenX, screenY, w, h);
      ctx.globalAlpha = 1;
    }

    // River
    if (tile.hasRiver) {
      ctx.fillStyle = '#4a90d9';
      ctx.fillRect(screenX + w * 0.4, screenY, w * 0.2, h);
    }

    // Resource
    if (tile.resource && w > 4) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(screenX + w/2, screenY + h/2, Math.max(2, w/4), 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // Main draw function
  const drawMap = useCallback(() => {
    if (!mapData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = mapData;

    // Clear canvas
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isIsometric) {
      // Isometric view - draw back to front
      for (let sum = 0; sum < width + height; sum++) {
        for (let x = Math.max(0, sum - height + 1); x <= Math.min(sum, width - 1); x++) {
          const y = sum - x;
          if (y < 0 || y >= height) continue;

          const tile = mapData.getTile(x, y);
          if (!tile) continue;

          const screen = worldToScreenIso(x, y);

          // Skip if off screen
          if (screen.x < -tileWidth || screen.x > canvas.width + tileWidth ||
              screen.y < -tileHeight * 2 || screen.y > canvas.height + tileHeight) {
            continue;
          }

          // Draw tile layers
          drawIsometricTile(ctx, screen.x, screen.y, tile, tileWidth, tileHeight);
          if (showRivers) drawRiver(ctx, screen.x, screen.y, tile, tileWidth, tileHeight);
          drawFeature(ctx, screen.x, screen.y, tile, tileWidth, tileHeight);
          if (showResources) drawResource(ctx, screen.x, screen.y, tile, tileWidth, tileHeight);

          // Grid overlay
          if (showGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(screen.x, screen.y);
            ctx.lineTo(screen.x + tileWidth / 2, screen.y + tileHeight / 2);
            ctx.lineTo(screen.x, screen.y + tileHeight);
            ctx.lineTo(screen.x - tileWidth / 2, screen.y + tileHeight / 2);
            ctx.closePath();
            ctx.stroke();
          }
        }
      }
    } else {
      // Top-down flat view
      const startX = Math.floor(-offset.x / tileWidth);
      const startY = Math.floor(-offset.y / tileHeight);
      const endX = Math.ceil((canvas.width - offset.x) / tileWidth);
      const endY = Math.ceil((canvas.height - offset.y) / tileHeight);

      for (let y = Math.max(0, startY); y < Math.min(height, endY); y++) {
        for (let x = Math.max(0, startX); x < Math.min(width, endX); x++) {
          const tile = mapData.getTile(x, y);
          if (!tile) continue;

          const screen = worldToScreenFlat(x, y);
          drawFlatTile(ctx, screen.x, screen.y, tile, tileWidth, tileHeight);

          if (showGrid && tileWidth > 4) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screen.x, screen.y, tileWidth, tileHeight);
          }
        }
      }
    }

    // Draw starting locations
    mapData.startingLocations.forEach((loc, i) => {
      const screen = isIsometric ? worldToScreenIso(loc.x, loc.y) : worldToScreenFlat(loc.x, loc.y);
      const markerSize = Math.max(8, tileWidth * 0.2);

      // Glow
      ctx.fillStyle = i === 0 ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(screen.x, screen.y + (isIsometric ? tileHeight * 0.3 : tileHeight / 2), markerSize + 6, 0, Math.PI * 2);
      ctx.fill();

      // Marker
      ctx.fillStyle = i === 0 ? '#00ff00' : '#ff4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y + (isIsometric ? tileHeight * 0.3 : tileHeight / 2), markerSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Hovered tile highlight
    if (hoveredTile && mapData.getTile(hoveredTile.x, hoveredTile.y)) {
      const screen = isIsometric
        ? worldToScreenIso(hoveredTile.x, hoveredTile.y)
        : worldToScreenFlat(hoveredTile.x, hoveredTile.y);

      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;

      if (isIsometric) {
        ctx.beginPath();
        ctx.moveTo(screen.x, screen.y);
        ctx.lineTo(screen.x + tileWidth / 2, screen.y + tileHeight / 2);
        ctx.lineTo(screen.x, screen.y + tileHeight);
        ctx.lineTo(screen.x - tileWidth / 2, screen.y + tileHeight / 2);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.strokeRect(screen.x, screen.y, tileWidth, tileHeight);
      }
    }
  }, [mapData, isIsometric, tileWidth, tileHeight, offset, showGrid, showResources, showRivers,
      hoveredTile, worldToScreenIso, worldToScreenFlat, drawIsometricTile, drawFlatTile,
      drawFeature, drawRiver, drawResource]);

  // Redraw on changes
  useEffect(() => {
    drawMap();
  }, [drawMap]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const container = containerRef.current;
        canvasRef.current.width = container.clientWidth;
        canvasRef.current.height = container.clientHeight;
        drawMap();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawMap]);

  // Mouse handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current || !mapData) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else {
      // Calculate hovered tile
      const world = isIsometric
        ? screenToWorldIso(mouseX, mouseY)
        : screenToWorldFlat(mouseX, mouseY);

      if (world.x >= 0 && world.x < mapData.width && world.y >= 0 && world.y < mapData.height) {
        setHoveredTile(world);
      } else {
        setHoveredTile(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredTile(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();

    // All scroll/trackpad gestures = pan only (zoom via slider)
    setOffset(prev => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY
    }));
  };

  // Get hovered tile info
  const hoveredTileInfo = hoveredTile && mapData ? mapData.getTile(hoveredTile.x, hoveredTile.y) : null;

  // Regenerate map
  const handleRegenerate = () => {
    setMapData(null);
    setIsGenerating(true);
    setTimeout(() => {
      const seed = Date.now();
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
      setIsGenerating(false);
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
        <h1>Map Preview {isIsometric ? '(Isometric)' : '(Top-Down)'}</h1>
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
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="game-sidebar">
          {/* Controls */}
          <section className="sidebar-section">
            <h3>View Controls</h3>
            <div className="control-group">
              <label>Zoom: {Math.round(zoom * 100)}%</label>
              <input
                type="range"
                min="0.15"
                max="2"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
              />
              <span className="control-hint">
                {isIsometric ? 'Isometric view' : 'Top-down view'}
              </span>
            </div>
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
                  checked={showResources}
                  onChange={(e) => setShowResources(e.target.checked)}
                />
                Show Resources
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
              {Object.entries(TERRAIN_STYLES).map(([terrain, style]) => (
                <div key={terrain} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: style.top }} />
                  <span className="legend-label">{terrain}</span>
                </div>
              ))}
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#2a5a2a' }} />
                <span className="legend-label">Forest</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#1a4a1a' }} />
                <span className="legend-label">Jungle</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#606060' }} />
                <span className="legend-label">Peak</span>
              </div>
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: '#ffd700' }} />
                <span className="legend-label">Resource</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Game;
