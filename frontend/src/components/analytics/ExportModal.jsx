import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ExportModal({ isOpen, onClose }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const handleExportPDF = async () => {
    setExporting(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_BASE_URL;
      const period = new URLSearchParams(window.location.search).get('period') || '30d';
      
      const url = `${baseUrl}/analytics/export/pdf?period=${period}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }
      
      // Download the PDF
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `analytics-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Export Report</h2>
              <p className="text-sm text-gray-500">Download as PDF summary</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* PDF Option */}
            <div className="text-center">
              <div className="p-6 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-cyan-200">
                <FileText className="w-12 h-12 text-cyan-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Summary Report</h3>
                <p className="text-sm text-gray-600 mb-4">
                  A professional 5-paragraph report containing:
                </p>
                <ul className="text-left text-sm text-gray-600 space-y-1 mb-4">
                  <li>• Executive Summary with meeting statistics</li>
                  <li>• Time investment analysis</li>
                  <li>• Task performance overview</li>
                  <li>• Team participation metrics</li>
                  <li>• Personalized recommendations</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF Report
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}