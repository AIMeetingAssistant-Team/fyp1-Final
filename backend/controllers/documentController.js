import Document from '../models/Document.js';
import Meeting from '../models/Meeting.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';
import { getFileCategory, validateFileSize } from '../middleware/uploadMiddleware.js';
import https from 'https';
import http from 'http';
import cloudinary from '../config/cloudinary.js';

// @desc    Upload document to meeting
// @route   POST /api/meetings/:meetingId/documents
// @access  Private
export const uploadDocument = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { name, description, isPublic } = req.body;

    console.log('Upload request received for meeting:', meetingId);
    console.log('Files received:', req.files ? req.files.length : 0);

    // Check if meeting exists and user has access
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check meeting status for upload permissions
    const now = new Date();

    // Completed meetings - no uploads allowed
    if (meeting.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot upload documents to completed meetings'
      });
    }

    // Cancelled meetings - no uploads allowed  
    if (meeting.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot upload documents to cancelled meetings'
      });
    }

    // ✅ UPDATED: Allow scheduled meetings at any time (not just when started)
    // ✅ Only allow: In-progress meetings OR scheduled meetings (always)
    const isMeetingActive =
      meeting.status === 'in-progress' ||
      meeting.status === 'scheduled'; // Removed: && meeting.startTime <= now

    if (!isMeetingActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot upload documents at this time. Meeting is not active.'
      });
    }

    // Check if user is host or participant
    const isHost = meeting.host.toString() === req.user.id;
    const isParticipant = meeting.isParticipant(req.user.id);

    if (!isHost && !isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload documents to this meeting'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedDocuments = [];
    const failedUploads = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        console.log('Processing file:', file.originalname);

        // Validate file size based on type
        validateFileSize(file);

        const category = getFileCategory(file.mimetype);
        const format = file.originalname.split('.').pop().toLowerCase();

        console.log('File details:', {
          name: file.originalname,
          category,
          format,
          size: file.size,
          mimetype: file.mimetype
        });

        // Create document record
        const document = await Document.create({
          name: name || file.originalname,
          originalName: file.originalname,
          description: description || '',
          url: file.path,
          publicId: file.filename,
          format: format,
          size: file.size,
          category: category,
          mimeType: file.mimetype,
          uploadedBy: req.user.id,
          meeting: meetingId,
          isPublic: isPublic || false,
          permissions: []
        });

        await document.populate('uploadedBy', 'name email profilePicture');
        uploadedDocuments.push(document);
        console.log('✅ File uploaded successfully:', file.originalname);

      } catch (fileError) {
        console.error('File upload failed:', file.originalname, fileError.message);
        failedUploads.push({
          file: file.originalname,
          error: fileError.message
        });
      }
    }

    // Prepare response
    let responseMessage = '';
    if (uploadedDocuments.length > 0 && failedUploads.length === 0) {
      responseMessage = `${uploadedDocuments.length} file(s) uploaded successfully`;
    } else if (uploadedDocuments.length > 0 && failedUploads.length > 0) {
      responseMessage = `${uploadedDocuments.length} file(s) uploaded successfully, ${failedUploads.length} failed`;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No valid files were uploaded',
        failedUploads: failedUploads
      });
    }

    res.status(201).json({
      success: true,
      message: responseMessage,
      documents: uploadedDocuments,
      failedUploads: failedUploads.length > 0 ? failedUploads : undefined
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all documents for a meeting
// @route   GET /api/meetings/:meetingId/documents
// @access  Private
export const getMeetingDocuments = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { category, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Check if meeting exists and user has access
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Check if user is host or participant
    const isHost = meeting.host.toString() === req.user.id;
    const isParticipant = meeting.isParticipant(req.user.id);

    if (!isHost && !isParticipant && meeting.isPrivate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view documents for this meeting'
      });
    }

    let query = { meeting: meetingId };

    // Filter by category if provided
    if (category && ['image', 'document', 'audio', 'video', 'other'].includes(category)) {
      query.category = category;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email profilePicture')
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      count: documents.length,
      documents
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
export const getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email profilePicture')
      .populate('meeting', 'title host');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    // const hasPermission = document.hasPermission(req.user.id, 'view');
    // if (!hasPermission) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Not authorized to view this document'
    //   });
    // }

    res.status(200).json({
      success: true,
      document
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private
export const updateDocument = async (req, res) => {
  try {
    const { name, description, isPublic, permissions } = req.body;

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user is the uploader
    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the uploader can update this document'
      });
    }

    // Allowed fields to update
    const allowedUpdates = ['name', 'description', 'isPublic', 'permissions'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        document[field] = req.body[field];
      }
    });

    await document.save();
    await document.populate('uploadedBy', 'name email profilePicture');

    res.status(200).json({
      success: true,
      message: 'Document updated successfully',
      document
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user is the uploader or meeting host
    const meeting = await Meeting.findById(document.meeting);
    const isUploader = document.uploadedBy.toString() === req.user.id;
    const isHost = meeting.host.toString() === req.user.id;

    if (!isUploader && !isHost) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this document'
      });
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(document.publicId);

    // Delete from database
    await Document.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to fetch file from Cloudinary URL and stream to response
const streamFileFromUrl = (url, res, filename, mimeType, isDownload = false) => {
  return new Promise((resolve, reject) => {
    try {
      // Validate URL
      if (!url || typeof url !== 'string') {
        reject(new Error('Invalid URL provided'));
        return;
      }

      console.log('Streaming from URL:', url);

      // Parse URL to determine protocol
      let urlObj;
      try {
        urlObj = new URL(url);
      } catch (urlError) {
        reject(new Error(`Invalid URL format: ${url}`));
        return;
      }

      const client = urlObj.protocol === 'https:' ? https : http;

      // Set appropriate headers first
      if (isDownload) {
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      }
      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, max-age=3600');

      // Fetch file from Cloudinary
      const request = client.get(urlObj, (response) => {
        console.log('Cloudinary response status:', response.statusCode);
        
        // Check if response is successful
        if (response.statusCode !== 200) {
          response.resume(); // Consume response to free memory
          reject(new Error(`Failed to fetch file from Cloudinary: ${response.statusCode}`));
          return;
        }

        // Update content type from Cloudinary if available
        if (response.headers['content-type']) {
          res.setHeader('Content-Type', response.headers['content-type']);
        }
        if (response.headers['content-length']) {
          res.setHeader('Content-Length', response.headers['content-length']);
        }

        // Handle errors from the response stream
        response.on('error', (err) => {
          if (!res.headersSent) {
            reject(err);
          }
        });

        // Pipe the response to client
        response.pipe(res);

        response.on('end', () => {
          console.log('File stream completed successfully');
          resolve();
        });
      });

      // Handle errors from the request
      request.on('error', (err) => {
        console.error('Request error:', err);
        if (!res.headersSent) {
          reject(err);
        }
      });

      // Set timeout
      request.setTimeout(30000, () => {
        console.error('Request timeout');
        request.destroy();
        reject(new Error('Request timeout'));
      });

    } catch (error) {
      console.error('Stream error:', error);
      reject(error);
    }
  });
};

// @desc    View document (stream from Cloudinary)
// @route   GET /api/documents/:id/view
// @access  Private
export const viewDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    const hasPermission = document.hasPermission(req.user.id, 'view');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this document'
      });
    }

    // Construct URL differently for PDFs
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const publicId = document.publicId;
    
    let cloudinaryUrl;
    
    // Special handling for PDFs - use different transformation
    if (document.format === 'pdf') {
      // For PDF viewing, use inline flag
      cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
      console.log('PDF view URL:', cloudinaryUrl);
    } else {
      // For other files, use raw upload
      cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/${publicId}`;
      console.log('Regular view URL:', cloudinaryUrl);
    }

    // Stream file from Cloudinary
    await streamFileFromUrl(
      cloudinaryUrl,
      res,
      document.name || document.originalName,
      document.mimeType,
      false // not a download
    );

  } catch (error) {
    console.error('View document error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to view document'
      });
    }
  }
};
// @desc    Download document (increment download count and stream)
// @route   GET /api/documents/:id/download
// @access  Private
export const downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    const hasPermission = document.hasPermission(req.user.id, 'download');
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this document'
      });
    }

    // Increment download count (async, don't wait)
    document.incrementDownloadCount().catch(err => 
      console.error('Failed to increment download count:', err)
    );

    // Construct URL with fl_attachment flag to force download
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const publicId = document.publicId;
    
    // For PDFs and other files, use this format with attachment flag
    const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/fl_attachment/${publicId}`;
    
    console.log('Download URL with attachment flag:', cloudinaryUrl);

    // Stream file from Cloudinary
    await streamFileFromUrl(
      cloudinaryUrl,
      res,
      document.name || document.originalName,
      document.mimeType,
      true // is download
    );

  } catch (error) {
    console.error('Download document error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to download document'
      });
    }
  }
};
// @desc    Get user's uploaded documents
// @route   GET /api/documents/my-documents
// @access  Private
export const getMyDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;

    let query = { uploadedBy: req.user.id };

    if (category && ['image', 'document', 'audio', 'video', 'other'].includes(category)) {
      query.category = category;
    }

    const documents = await Document.find(query)
      .populate('meeting', 'title startTime')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Document.countDocuments(query);

    res.status(200).json({
      success: true,
      documents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};