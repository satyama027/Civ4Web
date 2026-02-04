/**
 * Shared utilities for map generation
 *
 * Contains SeededRandom class and common helper functions used across
 * all map generation modules.
 */

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Seeded pseudo-random number generator using PCG algorithm.
 * Provides deterministic random sequences for reproducible map generation.
 */
export class SeededRandom {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  /**
   * Generate next random number in [0, 1)
   */
  next() {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer in [min, max] inclusive
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float in [min, max)
   */
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  /**
   * Fisher-Yates shuffle (in-place)
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a 2D array with given dimensions and default value
 * @param {number} width - Array width
 * @param {number} height - Array height
 * @param {*} defaultValue - Default value or factory function
 */
export function create2DArray(width, height, defaultValue = 0) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () =>
      typeof defaultValue === 'function' ? defaultValue() : defaultValue
    )
  );
}

/**
 * Clamp value to range [min, max]
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between a and b
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}
