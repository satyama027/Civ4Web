/**
 * HintedWorld - Block-based continent placement for Civ4-accurate map generation
 *
 * Direct port of CvMapGeneratorUtil.HintedWorld(FractalWorld) from Civ4 BTS.
 * Divides the map into a coarse block grid, places continents as connected
 * clusters of blocks, then feeds block values as hints to the fractal generator
 * for organic coastlines.
 *
 * Used by: Pangaea (Soren's + Andy's), Balanced, Inland Sea, Team Battleground.
 *
 * References:
 * - Civ4 SDK: CvMapGeneratorUtil.py HintedWorld class
 * - docs/MapGen-Rewrite-Plan.md Milestone 3
 */

import { FractalWorld, PLOT, FRAC_POLAR, FRAC_WRAP_X, FRAC_WRAP_Y } from './FractalWorld.js';

// Block value semantics
const LAND_THRESHOLD = 192;

// 8-directional offsets for neighbor checks
const DIRECTIONS = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1]
];

// 4-cardinal offsets for continent expansion
const CARDINAL_DIRS = [
  [0, -1], [0, 1], [-1, 0], [1, 0]
];

// ============================================================================
// CONTINENT CLASS
// ============================================================================

/**
 * Tracks an individual continent's blocks and provides plot-space queries.
 */
export class Continent {
  /**
   * @param {number} id - Unique continent identifier
   * @param {number} centerX - Center block X coordinate
   * @param {number} centerY - Center block Y coordinate
   * @param {number} targetNumBlocks - Target number of blocks for this continent
   * @param {number} maxRadius - Maximum Manhattan distance from center (-1 = unlimited)
   */
  constructor(id, centerX, centerY, targetNumBlocks, maxRadius = -1) {
    this.id = id;
    this.centerx = centerX;
    this.centery = centerY;
    this.targetNumBlocks = targetNumBlocks;
    this.maxradius = maxRadius;
    this.blocks = [[centerX, centerY]];
    this._rects = null; // Lazy-computed plot-space rectangles
  }

  /**
   * Get plot-space rectangles for all blocks in this continent
   *
   * @param {number} plotsPerBlockX - Plots per block horizontally
   * @param {number} plotsPerBlockY - Plots per block vertically
   * @returns {Array<{x1: number, y1: number, x2: number, y2: number}>}
   */
  getRects(plotsPerBlockX, plotsPerBlockY) {
    if (this._rects && this._rects.length === this.blocks.length) {
      return this._rects;
    }

    this._rects = this.blocks.map(([bx, by]) => ({
      x1: Math.floor(bx * plotsPerBlockX),
      y1: Math.floor(by * plotsPerBlockY),
      x2: Math.floor(bx * plotsPerBlockX) + plotsPerBlockX,
      y2: Math.floor(by * plotsPerBlockY) + plotsPerBlockY
    }));

    return this._rects;
  }

  /**
   * Check if a plot coordinate falls within this continent
   *
   * @param {number} x - Plot X coordinate
   * @param {number} y - Plot Y coordinate
   * @param {number} plotsPerBlockX - Plots per block horizontally
   * @param {number} plotsPerBlockY - Plots per block vertically
   * @returns {boolean}
   */
  containsPlot(x, y, plotsPerBlockX, plotsPerBlockY) {
    const rects = this.getRects(plotsPerBlockX, plotsPerBlockY);
    for (const rect of rects) {
      if (x >= rect.x1 && x < rect.x2 && y >= rect.y1 && y < rect.y2) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the center plot coordinate of this continent
   *
   * @param {number} plotsPerBlockX - Plots per block horizontally
   * @param {number} plotsPerBlockY - Plots per block vertically
   * @returns {{x: number, y: number}}
   */
  getCenterPlot(plotsPerBlockX, plotsPerBlockY) {
    return {
      x: Math.floor(plotsPerBlockX * (this.centerx + 0.5)),
      y: Math.floor(plotsPerBlockY * (this.centery + 0.5))
    };
  }

  /**
   * Invalidate cached rectangles (call after adding blocks)
   */
  invalidateRects() {
    this._rects = null;
  }
}

// ============================================================================
// HINTEDWORLD CLASS
// ============================================================================

/**
 * HintedWorld - Extends FractalWorld with block-based continent hints
 *
 * Workflow:
 * 1. Create HintedWorld with block grid dimensions
 * 2. Set block values manually (Soren's method) or via addContinent/buildAllContinents (Andy's method)
 * 3. Call generatePlotTypes() which feeds hints to the fractal and generates plots
 */
export class HintedWorld extends FractalWorld {
  /**
   * @param {number} mapWidth - Map width in tiles
   * @param {number} mapHeight - Map height in tiles
   * @param {number} w - Block grid width (default 16)
   * @param {number} h - Block grid height (default 8)
   * @param {Object} settings - FractalWorld settings (fracXExp, fracYExp, wrapX, wrapY, etc.)
   */
  constructor(mapWidth, mapHeight, w = 16, h = 8, settings = {}) {
    super(mapWidth, mapHeight, settings);

    // Plots per block — computed BEFORE the +1 adjustment (matches original Civ4)
    this.plotsPerBlockX = Math.floor(this.iNumPlotsX / w);
    this.plotsPerBlockY = Math.floor(this.iNumPlotsY / h);

    // Matching original Civ4: non-wrapping axes get +1 block for the edge
    if (!this.wrapX) w += 1;
    if (!this.wrapY) h += 1;

    // Block grid dimensions (after +1 adjustment)
    this.w = w;
    this.h = h;

    // Block data: null = unassigned, 0-191 = water, 192-255 = land
    this.data = new Array(w * h).fill(null);

    // Continent list
    this.continents = [];

    // Block ownership map for fast lookup: "x,y" → continent id
    this._blockOwner = new Map();

    // Next continent ID
    this._nextContinentId = 0;
  }

  // ==========================================================================
  // BLOCK GRID METHODS
  // ==========================================================================

  /**
   * Normalize block coordinates (wrap if map wraps)
   *
   * @param {number} x - Block X coordinate
   * @param {number} y - Block Y coordinate
   * @returns {{x: number, y: number, valid: boolean}}
   */
  normalizeBlock(x, y) {
    if (this.wrapX) {
      x = ((x % this.w) + this.w) % this.w;
    } else if (x < 0 || x >= this.w) {
      return { x, y, valid: false };
    }

    if (this.wrapY) {
      y = ((y % this.h) + this.h) % this.h;
    } else if (y < 0 || y >= this.h) {
      return { x, y, valid: false };
    }

    return { x, y, valid: true };
  }

  /**
   * Set block value at coordinates
   *
   * @param {number} x - Block X coordinate
   * @param {number} y - Block Y coordinate
   * @param {number|null} val - Value to set (null, 0-255)
   */
  setValue(x, y, val) {
    const norm = this.normalizeBlock(x, y);
    if (!norm.valid) return;
    this.data[norm.y * this.w + norm.x] = val;
  }

  /**
   * Get block value at coordinates
   *
   * @param {number} x - Block X coordinate
   * @param {number} y - Block Y coordinate
   * @returns {number|null} Block value, or null if out of bounds / unassigned
   */
  getValue(x, y) {
    const norm = this.normalizeBlock(x, y);
    if (!norm.valid) return null;
    return this.data[norm.y * this.w + norm.x];
  }

  /**
   * Convert block coordinates to plot coordinates
   *
   * @param {number} blockX - Block X coordinate
   * @param {number} blockY - Block Y coordinate
   * @returns {{x: number, y: number}}
   */
  blockToPlot(blockX, blockY) {
    return {
      x: Math.floor(blockX * this.plotsPerBlockX),
      y: Math.floor(blockY * this.plotsPerBlockY)
    };
  }

  // ==========================================================================
  // CONTINENT MANAGEMENT
  // ==========================================================================

  /**
   * Check if a block position is valid for continent placement/expansion
   *
   * @param {number} x - Block X coordinate
   * @param {number} y - Block Y coordinate
   * @param {Continent|null} continent - Continent being expanded (null for general check)
   * @returns {boolean}
   */
  isValid(x, y, continent = null) {
    // Normalize coordinates
    const norm = this.normalizeBlock(x, y);
    if (!norm.valid) return false;
    const nx = norm.x;
    const ny = norm.y;

    // Check max radius constraint
    if (continent && continent.maxradius > 0) {
      let dx = Math.abs(nx - continent.centerx);
      let dy = Math.abs(ny - continent.centery);
      // Handle wrapping for distance calculation
      if (this.wrapX) dx = Math.min(dx, this.w - dx);
      if (this.wrapY) dy = Math.min(dy, this.h - dy);
      if (dx + dy > continent.maxradius) return false;
    }

    // Block must be unassigned
    if (this.data[ny * this.w + nx] !== null) return false;

    // Check all 8 neighbors for foreign continent blocks
    for (const [ddx, ddy] of DIRECTIONS) {
      const neighborNorm = this.normalizeBlock(nx + ddx, ny + ddy);
      if (!neighborNorm.valid) continue;

      const neighborVal = this.data[neighborNorm.y * this.w + neighborNorm.x];
      if (neighborVal !== null && neighborVal >= LAND_THRESHOLD) {
        // This neighbor is land — check if it belongs to a different continent
        const ownerKey = `${neighborNorm.x},${neighborNorm.y}`;
        const ownerId = this._blockOwner.get(ownerKey);
        if (ownerId !== undefined && continent && ownerId !== continent.id) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Find a valid block near the given position, searching at increasing Manhattan distances
   *
   * @param {number} x - Starting block X
   * @param {number} y - Starting block Y
   * @param {number} dist - Starting search distance (-1 = start at 0)
   * @param {Continent|null} continent - Continent constraint (null for general)
   * @param {SeededRandom} rng - Random number generator for shuffling
   * @returns {{x: number, y: number}|null} Valid block position, or null if none found
   */
  findValid(x, y, dist = -1, continent = null, rng = null) {
    const startDist = dist < 0 ? 0 : dist;
    const maxDist = Math.max(this.w, this.h);

    for (let d = startDist; d <= maxDist; d++) {
      // Collect all blocks at Manhattan distance d
      const candidates = [];

      if (d === 0) {
        candidates.push({ x, y });
      } else {
        // Walk the diamond perimeter at distance d
        for (let i = 0; i < d; i++) {
          candidates.push({ x: x + d - i, y: y + i });
          candidates.push({ x: x - i, y: y + d - i });     // Corrected: was missing negative
          candidates.push({ x: x - d + i, y: y - i });
          candidates.push({ x: x + i, y: y - d + i });
        }
      }

      // Shuffle candidates
      if (rng) {
        rng.shuffle(candidates);
      }

      // Return first valid
      for (const cand of candidates) {
        if (this.isValid(cand.x, cand.y, continent)) {
          const norm = this.normalizeBlock(cand.x, cand.y);
          return { x: norm.x, y: norm.y };
        }
      }
    }

    return null;
  }

  /**
   * Add a new continent to the map
   *
   * @param {SeededRandom} rng - Random number generator
   * @param {number} numBlocks - Target number of blocks
   * @param {number} x - Center X (-1 for random)
   * @param {number} y - Center Y (-1 for random)
   * @param {number} maxDist - Max search distance for initial placement (-1 = unlimited)
   * @param {number} maxRadius - Max expansion radius (-1 = unlimited)
   * @returns {Continent|null} The created continent, or null if placement failed
   */
  addContinent(rng, numBlocks, x = -1, y = -1, maxDist = -1, maxRadius = -1) {
    // Find starting position
    let startX = x;
    let startY = y;

    if (startX === -1 || startY === -1) {
      // Random starting position
      startX = rng.nextInt(0, this.w - 1);
      startY = rng.nextInt(0, this.h - 1);
    }

    // Create temporary continent for isValid checks
    const id = this._nextContinentId++;
    const continent = new Continent(id, startX, startY, numBlocks, maxRadius);

    // Find valid position near requested location
    const validPos = this.findValid(startX, startY, maxDist, continent, rng);
    if (!validPos) return null;

    // Update continent center to actual position
    continent.centerx = validPos.x;
    continent.centery = validPos.y;
    continent.blocks = [[validPos.x, validPos.y]];

    // Set block value: land center
    const centerValue = LAND_THRESHOLD + rng.nextInt(0, 63); // 192-255
    this.setValue(validPos.x, validPos.y, centerValue);
    this._blockOwner.set(`${validPos.x},${validPos.y}`, continent.id);

    this.continents.push(continent);
    return continent;
  }

  /**
   * Expand a continent by adding adjacent blocks
   *
   * @param {SeededRandom} rng - Random number generator
   * @param {Continent} continent - Continent to expand
   * @param {number} numBlocks - Number of blocks to add
   */
  expandContinentBy(rng, continent, numBlocks) {
    for (let n = 0; n < numBlocks; n++) {
      // Collect all valid adjacent blocks for any existing continent block
      const candidates = [];
      const existingBlocks = [...continent.blocks];
      rng.shuffle(existingBlocks);

      for (const [bx, by] of existingBlocks) {
        const shuffledDirs = [...CARDINAL_DIRS];
        rng.shuffle(shuffledDirs);

        for (const [dx, dy] of shuffledDirs) {
          const nx = bx + dx;
          const ny = by + dy;
          if (this.isValid(nx, ny, continent)) {
            const norm = this.normalizeBlock(nx, ny);
            if (norm.valid) {
              // Check for duplicate candidates
              const key = `${norm.x},${norm.y}`;
              if (!candidates.some(c => `${c.x},${c.y}` === key)) {
                candidates.push({ x: norm.x, y: norm.y });
              }
            }
          }
        }
      }

      if (candidates.length === 0) {
        // Try findValid from continent center as fallback
        const fallback = this.findValid(continent.centerx, continent.centery, -1, continent, rng);
        if (!fallback) break; // Can't expand further
        candidates.push(fallback);
      }

      // Pick random candidate
      const chosen = candidates[rng.nextInt(0, candidates.length - 1)];

      // Set block value: expanded land
      const expandValue = 208 + rng.nextInt(0, 47); // 208-255
      this.setValue(chosen.x, chosen.y, expandValue);
      this._blockOwner.set(`${chosen.x},${chosen.y}`, continent.id);
      continent.blocks.push([chosen.x, chosen.y]);
      continent.invalidateRects();
    }
  }

  /**
   * Build all continents via round-robin expansion.
   * Each continent grows by 1 block per pass until all reach target size.
   *
   * @param {SeededRandom} rng - Random number generator
   */
  buildAllContinents(rng) {
    let anyIncomplete = true;

    while (anyIncomplete) {
      anyIncomplete = false;

      for (const continent of this.continents) {
        if (continent.blocks.length < continent.targetNumBlocks) {
          this.expandContinentBy(rng, continent, 1);
          if (continent.blocks.length < continent.targetNumBlocks) {
            anyIncomplete = true;
          }
        }
      }

      // Safety: check if we made progress, break if stuck
      let totalBlocks = 0;
      let totalTarget = 0;
      for (const c of this.continents) {
        totalBlocks += c.blocks.length;
        totalTarget += c.targetNumBlocks;
      }
      if (totalBlocks >= totalTarget) break;

      // Check if any continent still has room to grow
      let canGrow = false;
      for (const continent of this.continents) {
        if (continent.blocks.length < continent.targetNumBlocks) {
          // Check if there are any valid adjacent blocks
          for (const [bx, by] of continent.blocks) {
            for (const [dx, dy] of CARDINAL_DIRS) {
              if (this.isValid(bx + dx, by + dy, continent)) {
                canGrow = true;
                break;
              }
            }
            if (canGrow) break;
          }
        }
        if (canGrow) break;
      }
      if (!canGrow) break;
    }
  }

  // ==========================================================================
  // HINT SHIFTING
  // ==========================================================================

  /**
   * Find best X split for hint grid (same algorithm as FractalWorld.findBestSplitX
   * but operates on the block grid)
   *
   * @param {number} stripRadius - Half-width of scoring strip
   * @returns {number} Best split column index
   */
  bestHintsSplitX(stripRadius) {
    const stripSize = 2 * stripRadius;
    if (stripSize > this.w) return 0;

    const weights = this.calcWeights(stripRadius);
    const scores = new Array(this.w).fill(0);

    for (let x = 0; x < this.w; x++) {
      // Count land blocks in this column
      let landCount = 0;
      for (let y = 0; y < this.h; y++) {
        const val = this.data[y * this.w + x];
        if (val !== null && val >= LAND_THRESHOLD) landCount++;
      }

      // +30 bonus for any land (prevents splits through continents)
      if (landCount > 0) landCount += 30;

      // Distribute score across strip
      for (let i = 0; i < stripSize; i++) {
        const targetCol = ((x - stripRadius + i) % this.w + this.w) % this.w;
        scores[targetCol] += landCount * weights[i];
      }
    }

    // Find minimum score
    let bestIdx = 0;
    let bestScore = scores[0];
    for (let i = 1; i < this.w; i++) {
      if (scores[i] < bestScore) {
        bestScore = scores[i];
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  /**
   * Find best Y split for hint grid
   *
   * @param {number} stripRadius - Half-width of scoring strip
   * @returns {number} Best split row index
   */
  bestHintsSplitY(stripRadius) {
    const stripSize = 2 * stripRadius;
    if (stripSize > this.h) return 0;

    const weights = this.calcWeights(stripRadius);
    const scores = new Array(this.h).fill(0);

    for (let y = 0; y < this.h; y++) {
      // Count land blocks in this row
      let landCount = 0;
      for (let x = 0; x < this.w; x++) {
        const val = this.data[y * this.w + x];
        if (val !== null && val >= LAND_THRESHOLD) landCount++;
      }

      if (landCount > 0) landCount += 30;

      for (let i = 0; i < stripSize; i++) {
        const targetRow = ((y - stripRadius + i) % this.h + this.h) % this.h;
        scores[targetRow] += landCount * weights[i];
      }
    }

    let bestIdx = 0;
    let bestScore = scores[0];
    for (let i = 1; i < this.h; i++) {
      if (scores[i] < bestScore) {
        bestScore = scores[i];
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  /**
   * Shift hint data to center continents on the block grid.
   * Same concept as shiftPlotTypes() but for the block-level hints.
   */
  shiftHintsToMap() {
    const hintStripRadius = Math.max(2, Math.floor(Math.min(this.w, this.h) / 4));

    const bestShiftX = this.wrapX ? this.bestHintsSplitX(hintStripRadius) : 0;
    const bestShiftY = this.wrapY ? this.bestHintsSplitY(hintStripRadius) : 0;

    if (bestShiftX === 0 && bestShiftY === 0) return;

    // Shift block data
    const newData = new Array(this.w * this.h).fill(null);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let srcX = (x + bestShiftX) % this.w;
        let srcY = this.wrapY ? (y + bestShiftY) % this.h : y;
        if (!this.wrapY && srcY !== y + bestShiftY) continue;

        newData[y * this.w + x] = this.data[srcY * this.w + srcX];
      }
    }
    this.data = newData;

    // Rebuild block owner map and update continent block positions
    this._blockOwner.clear();
    for (const continent of this.continents) {
      const newBlocks = [];
      for (const [bx, by] of continent.blocks) {
        let newX = ((bx - bestShiftX) % this.w + this.w) % this.w;
        let newY = this.wrapY ? ((by - bestShiftY) % this.h + this.h) % this.h : by;
        newBlocks.push([newX, newY]);
        this._blockOwner.set(`${newX},${newY}`, continent.id);
      }
      continent.blocks = newBlocks;
      continent.centerx = ((continent.centerx - bestShiftX) % this.w + this.w) % this.w;
      if (this.wrapY) {
        continent.centery = ((continent.centery - bestShiftY) % this.h + this.h) % this.h;
      }
      continent.invalidateRects();
    }
  }

  // ==========================================================================
  // PLOT TYPE GENERATION (OVERRIDE)
  // ==========================================================================

  /**
   * Generate plot types using hint-seeded fractal.
   *
   * Overrides FractalWorld.generatePlotTypes:
   * 1. Fills unassigned blocks with low water values
   * 2. Initializes continent fractal via fracInitHints
   * 3. Auto-calculates water percent from block distribution if -1
   * 4. Delegates to parent for hills/peaks/threshold logic
   *
   * @param {SeededRandom} rng - Random number generator
   * @param {Object} params - Generation parameters
   * @param {number} params.water_percent - Water percentage (-1 for auto)
   * @param {number} params.continent_grain - Continent fractal grain (default 2)
   * @param {number} params.grain_amount - Hills/peaks grain (default 3)
   * @param {boolean} params.shift_plot_types - Whether to shift final plots (default false)
   * @returns {number[]} 1D array of plot types
   */
  generatePlotTypes(rng, params = {}) {
    const {
      water_percent = -1,
      grain_amount = 3,
      shift_plot_types = false
    } = params;

    // 1. Shift hints to center land on the block grid
    this.shiftHintsToMap();

    // 2. Fill null entries with low water values
    for (let i = 0; i < this.data.length; i++) {
      if (this.data[i] === null) {
        this.data[i] = rng.nextInt(0, 47);
      }
    }

    // 3. Compute grain from data size (matching original Civ4 __doInitFractal)
    const size = this.data.length;
    const minExp = Math.min(this.fracXExp, this.fracYExp);
    let iGrain = 1; // fallback
    for (let i = 0; i < minExp; i++) {
      let gw = 1 << (this.fracXExp - minExp + i);
      let gh = 1 << (this.fracYExp - minExp + i);
      if (!this.wrapX) gw += 1;
      if (!this.wrapY) gh += 1;
      if (size === gw * gh) {
        iGrain = i;
        break;
      }
    }

    // 4. Initialize continent fractal with hints
    const flags = this.getMapFractalFlags();
    this.continentsFrac.fracInitHints(
      this.data, this.w, this.h,
      this.iNumPlotsX, this.iNumPlotsY,
      iGrain, rng, flags
    );

    // 3. Auto-calculate water percent if -1
    let effectiveWaterPercent = water_percent;
    if (effectiveWaterPercent === -1) {
      let waterBlocks = 0;
      for (let i = 0; i < this.data.length; i++) {
        if (this.data[i] < LAND_THRESHOLD) waterBlocks++;
      }
      effectiveWaterPercent = Math.round((waterBlocks / this.data.length) * 100);
    }

    // 4. Delegate to parent for hills/peaks and plot assignment
    // The parent's generatePlotTypes does NOT re-init continentsFrac —
    // it only initializes hills/peaks fractals and uses the already-initialized continentsFrac
    return super.generatePlotTypes(rng, {
      water_percent: effectiveWaterPercent,
      grain_amount,
      shift_plot_types
    });
  }
}

export default HintedWorld;
