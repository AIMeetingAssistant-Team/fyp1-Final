import multer from 'multer';
import { storage } from '../config/cloudinary.js';

// Allowed MIME types
const allowedMimeTypes = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml',

  // PDF
  'application/pdf',

  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-word.document.macroEnabled.12',

  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint.presentation.macroEnabled.12',

  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',

  // Text files
  'text/plain',
  'text/rtf',
  'text/markdown',
  'text/csv',

  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',

  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/flac', 'audio/aac',

  // Video
  'video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/x-matroska',

  // Fallback when MIME type is unknown
  'application/octet-stream'
];

// Allowed extensions
const allowedExtensions = [
  'jpg','jpeg','png','gif','bmp','webp','svg',
  'pdf','doc','docx','ppt','pptx','xls','xlsx',
  'txt','rtf','md','csv','zip','rar','7z',
  'mp3','wav','ogg','m4a','flac','aac',
  'mp4','avi','mov','wmv','flv','webm','mkv'
];

// File filter with hybrid check
const fileFilter = (req, file, cb) => {
  const ext = file.originalname.split('.').pop().toLowerCase();

  console.log('🔍 Upload attempt:', {
    file: file.originalname,
    mimetype: file.mimetype,
    ext
  });

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    console.log('✅ Accepted:', file.originalname);
    cb(null, true);
  } else {
    console.log('❌ Rejected:', file.originalname, file.mimetype);
    cb(new Error(`Unsupported file type: ${file.originalname} (${file.mimetype})`), false);
  }
};

// Configure Multer with Cloudinary storage
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 10 // Max 10 files per upload
  }
});

// Error handler
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Max 50MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: 'Too many files. Max 10.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, message: 'Unexpected field name. Use "documents".' });
    }
  } else if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// Helper: file category
export const getFileCategory = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf') || mimetype.includes('word') || mimetype.includes('powerpoint') ||
      mimetype.includes('excel') || mimetype.includes('text') || mimetype.includes('csv') ||
      mimetype.includes('zip') || mimetype.includes('rar')) {
    return 'document';
  }
  return 'other';
};

// Helper: validate size
export const validateFileSize = (file, maxSizes = {}) => {
  const defaults = {
    image: 10 * 1024 * 1024, // 10MB
    document: 20 * 1024 * 1024, // 20MB
    audio: 30 * 1024 * 1024, // 30MB
    video: 50 * 1024 * 1024, // 50MB
    other: 5 * 1024 * 1024   // 5MB
  };

  const limits = { ...defaults, ...maxSizes };
  const category = getFileCategory(file.mimetype);
  const maxSize = limits[category] || limits.other;

  if (file.size > maxSize) {
    throw new Error(`File too large. Max for ${category} is ${maxSize / (1024 * 1024)}MB.`);
  }
  return true;
};
