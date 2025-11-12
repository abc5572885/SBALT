/**
 * Date formatting utilities
 * Centralized date formatting functions for consistent display across the app
 */

/**
 * Format date to Chinese format: YYYY年MM月DD日
 * Example: 2024年1月15日
 */
export function formatDateChinese(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
}

/**
 * Format date to ISO format: YYYY-MM-DD
 * Example: 2024-01-15
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time to HH:MM
 * Example: 14:30
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

