/**
 * Convert JSON data to CSV format
 * @param {Array} data - Array of objects to convert
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const escapeValue = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };
  
  const rows = data.map(obj => headers.map(header => escapeValue(obj[header])).join(','));
  return [headers.join(','), ...rows].join('\n');
};

/**
 * Convert JSON data to JSON format with metadata
 * @param {Array} data - Array of objects to convert
 * @param {Object} metadata - Optional metadata to include
 * @returns {string} JSON formatted string
 */
export const convertToJSON = (data, metadata = {}) => {
  const exportData = {
    exportedAt: new Date().toISOString(),
    count: data.length,
    metadata,
    data
  };
  return JSON.stringify(exportData, null, 2);
};

/**
 * Get filename with timestamp
 * @param {string} prefix - File prefix (e.g., 'meeting-report')
 * @param {string} format - File format (csv or json)
 * @returns {string} Filename with timestamp
 */
export const getExportFilename = (prefix, format) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}-${timestamp}.${format}`;
};

/**
 * Format date for export
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForExport = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString();
};

/**
 * Format duration in minutes to readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Human readable duration
 */
// Add this to backend/utils/exportUtils.js if not present
export const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} min`;
};