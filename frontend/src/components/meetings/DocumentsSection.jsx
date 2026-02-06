import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  FileArchive,
  AlertCircle,
  CheckCircle,
  Trash2,
  Loader2
} from 'lucide-react';
import Modal from '../layout/Modal';

const DocumentsSection = ({ selected }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);
  const baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

  // Fetch documents
  useEffect(() => {
    if (selected?._id) {
      fetchDocuments();
    }
  }, [selected]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // ✅ CORRECT URL CONSTRUCTION
      const url = `${baseURL}/documents/meetings/${selected._id}/documents`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        showMessage('error', data.message || 'Failed to load documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text, duration = 5000) => {
    setMessage({ type, text });
    setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, duration);
  };

  // Check upload permission
  const canUpload = () => {
    if (!selected) return false;
    return selected.status === 'scheduled' || selected.status === 'in-progress';
  };

  // Handle file upload
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    if (!canUpload()) {
      showMessage('error', `Cannot upload to ${selected?.status} meeting`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('documents', file);
      });
      formData.append('isPublic', 'true');

      const token = localStorage.getItem('token');

      // ✅ CORRECT URL CONSTRUCTION
      const url = `${baseURL}/documents/meetings/${selected._id}/documents`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', `${files.length} file(s) uploaded successfully`);
        fetchDocuments();
      } else {
        showMessage('error', data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showMessage('error', 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
    event.target.value = '';
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (mimeType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (mimeType?.includes('video')) return <VideoIcon className="w-5 h-5 text-purple-500" />;
    if (mimeType?.includes('audio')) return <Music className="w-5 h-5 text-green-500" />;
    if (mimeType?.includes('zip')) return <FileArchive className="w-5 h-5 text-yellow-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDelete = async (docId) => {
    if (!docToDelete) return;
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${baseURL}/documents/${docToDelete}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        showMessage('success', 'Document deleted');
        setShowDeleteModal(false);
        fetchDocuments();
      } else {
        showMessage('error', data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showMessage('error', 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Message Alert */}
      {message.text && (
        <div className={`p-3 rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
          <div className="flex items-center">
            {message.type === 'error' ? <AlertCircle className="w-4 h-4 mr-2" /> :
              message.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> :
                <AlertCircle className="w-4 h-4 mr-2" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Header with SINGLE Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Meeting Documents</h3>
          <p className="text-sm text-gray-600">
            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>

        {canUpload() && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Document
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.mp3,.wav,.zip,.rar"
              disabled={uploading}
            />
          </div>
        )}
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            {canUpload() ? 'No documents yet' : 'Documents Unavailable'}
          </h4>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            {canUpload()
              ? 'Upload documents, images, or videos to share with meeting participants.'
              : `Document upload is not available for ${selected?.status} meetings.`}
          </p>
          {canUpload() && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              Upload Your First Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1">
          {documents.map(doc => (
            <div key={doc._id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow group mb-2">
              <div className="flex items-center justify-between mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {getFileIcon(doc.mimeType)}
                  <div className="overflow-hidden">
                    <h4 className="font-medium text-gray-900 truncate" title={doc.name}>
                      {doc.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.size)} • {doc.format?.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  
                  <a
                    href={doc.url}
                    download={doc.name}
                    className="flex-1 px-3 py-1.5 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              </div>

              {doc.uploadedBy && (
                <div className='flex justify-between items-center border-t border-gray-100 mt-3 pt-3'>
                  <div className="text-xs text-gray-500">
                    <p>Uploaded by {doc.uploadedBy.name}</p>
                    <p className="mt-0.5">
                      {new Date(doc.createdAt).toLocaleDateString()} at{' '}
                      {new Date(doc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {canUpload() && (
                    <button
                      onClick={() => {
                        setDocToDelete(doc._id);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showDeleteModal}
        title="Delete Document"
        onClose={() => setShowDeleteModal(false)}
        size="md"
        actions={[
          {
            label: "Cancel",
            onClick: () => setShowDeleteModal(false),
            className: "px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          },
          {
            label: "Delete Document",
            onClick: handleDelete,
            className: "px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all font-medium shadow-sm"
          },
        ]}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Deletion</h3>
          <p className="text-gray-600 mb-1">Are you sure you want to delete this document?</p>
          <p className="text-gray-500 text-sm">This action cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentsSection;