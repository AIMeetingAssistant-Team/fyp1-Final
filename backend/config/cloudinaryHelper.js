import cloudinary from './cloudinary.js';
import axios from 'axios';

/**
 * Fetch file from Cloudinary
 */
export const fetchFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('Public ID is required');
    }

    console.log(`📥 Fetching from Cloudinary: ${publicId}`);
    
    // Method 1: Using Cloudinary SDK (if available for your file type)
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: 'raw', // For audio/video files
        type: 'upload'
      });
      
      // Get the secure URL
      const url = result.secure_url;
      
      // Download the file
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      return Buffer.from(response.data);
      
    } catch (cloudinaryError) {
      console.warn('Cloudinary SDK fetch failed, trying direct URL:', cloudinaryError.message);
      
      // Method 2: Construct direct URL
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const directUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}`;
      
      const response = await axios.get(directUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      return Buffer.from(response.data);
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch from Cloudinary:', error.message);
    throw new Error(`Failed to fetch file: ${error.message}`);
  }
};

/**
 * Get file info from Cloudinary
 */
export const getFileInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'auto'
    });
    
    return {
      success: true,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      url: result.secure_url,
      duration: result.duration, // For audio/video
      width: result.width, // For images/video
      height: result.height, // For images/video
      createdAt: result.created_at
    };
    
  } catch (error) {
    console.error('Get file info error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};