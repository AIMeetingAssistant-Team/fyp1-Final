import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';

dotenv.config();

// Configure Cloudinary with optimized settings for large files
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 600000, // Increase to 10 minutes
  upload_timeout: 600000,
});

// Function to sanitize file names for Cloudinary
const sanitizeFileName = (fileName) => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
    .substring(0, 100);
};

// Create dynamic storage engine for Multer with optimized settings
export const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    const originalName = path.parse(file.originalname).name;

    const sanitizedName = sanitizeFileName(originalName);
    const uniqueName = `${sanitizedName}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];

    let resourceType = 'raw';
    if (imageExts.includes(ext)) resourceType = 'image';
    else if (videoExts.includes(ext)) resourceType = 'video';
    else if (audioExts.includes(ext)) resourceType = 'video';

    // Optimize video uploads with chunked uploads
    const params = {
      folder: 'ai-meeting-assistant',
      resource_type: resourceType,
      public_id: uniqueName,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      timeout: 600000, // Add timeout
    };

    // For videos: Enable async processing to handle large files
    if (resourceType === 'video') {
      // Enable chunked upload for large videos (helps with large file uploads)
      if (file.size > 50 * 1024 * 1024) {
        params.chunk_size = 50 * 1024 * 1024; // 50MB chunks for large videos
      }
      // Set eager_async with empty eager array to enable async processing mode
      // This tells Cloudinary to process asynchronously even without transformations
      // This prevents synchronous processing errors for large videos
      params.eager_async = true;
      params.eager = []; // Empty array to enable async mode
      // Don't set format - let Cloudinary store the original format
    } else {
      // For non-video files, you can set format if needed
      params.format = ext;
    }
    
    return params;
  },
});

// Create multer instance for recordings with increased limits
export const recordingUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm',
      'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/x-m4a', 'audio/aac', 'audio/flac',
    ];
    const allowedExtensions = ['mp4', 'mpeg', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
    const ext = path.extname(file.originalname).slice(1).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only audio and video files are allowed.`), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // Reduce to 500MB for Cloudinary compatibility
    files: 10
  }
});

// Special upload for large videos using Cloudinary's upload_large API
export const uploadLargeVideoToCloudinary = async (buffer, fileName, options = {}) => {
  try {
    // Convert buffer to base64 for Cloudinary
    const base64Data = buffer.toString('base64');
    const dataUri = `data:video/mp4;base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'ai-meeting-assistant',
      resource_type: 'video',
      chunk_size: 20 * 1024 * 1024,
      timeout: 300000,
      // Don't use eager transformations for large videos to avoid synchronous processing errors
      ...options,
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary large video upload failed: ${error.message}`);
  }
};
// Utility functions for Cloudinary
export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'ai-meeting-assistant',
      resource_type: 'auto',
      timeout: 120000,
      ...options,
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
    });
    return result;
  } catch (error) {
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

export default cloudinary;