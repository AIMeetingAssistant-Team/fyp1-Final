/**
 * Download data as a file
 * @param {string} data - File content
 * @param {string} filename - Name of the file
 * @param {string} mimeType - MIME type of the file
 */
export const downloadFile = (data, filename, mimeType = 'text/csv') => {
  const blob = new Blob([data], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format date for export filename
 * @returns {string} Formatted timestamp
 */
export const getExportTimestamp = () => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
};

/**
 * Convert array of objects to CSV
 * @param {Array} data - Array of objects
 * @returns {string} CSV string
 */
export const arrayToCSV = (data) => {
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
 * Trigger browser download of API response
 * @param {Response} response - Fetch API response
 * @param {string} defaultFilename - Default filename if not in headers
 */
export const handleFileDownload = async (response, defaultFilename) => {
  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');
  let filename = defaultFilename;
  
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '');
    }
  }
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};