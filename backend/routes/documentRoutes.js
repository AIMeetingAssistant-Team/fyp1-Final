import express from 'express';
import {
  uploadDocument,
  getMeetingDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getMyDocuments
} from '../controllers/documentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload, handleUploadErrors } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// ✅ Apply protect middleware to ALL document routes
router.use(protect);

// Upload documents to a meeting
router.post('/meetings/:meetingId/documents', 
  upload.array('documents', 10), 
  handleUploadErrors, 
  uploadDocument
);

// Get meeting documents
router.get('/meetings/:meetingId/documents', getMeetingDocuments);

// User's documents
router.get('/my-documents', getMyDocuments);

// Single document operations
router.route('/:id')
  .get(getDocument)
  .put(updateDocument)
  .delete(deleteDocument);

// Download document
router.get('/:id/download', downloadDocument);

export default router;