/**
 * Time utility functions
 */

/**
 * Format seconds into HH:MM:SS or MM:SS format
 * @param {number} seconds - Total seconds to format
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // 如果超過 1 小時，顯示 HH:MM:SS，否則只顯示 MM:SS
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
