/**
 * Logging utilities
 * Provides consistent, prefixed logging for debugging
 */

/**
 * Create a logger instance for a specific component
 * @param {string} component - Component name (e.g., 'Background', 'Popup', 'ContentScript')
 * @returns {Object} Logger instance with info, warn, error methods
 */
export function createLogger(component) {
  const prefix = `[${component}]`;

  return {
    info: (...args) => console.log(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args)
  };
}
