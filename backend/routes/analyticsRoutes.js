import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getAnalyticsDashboard,
  exportSummaryPDF
} from '../controllers/analyticsController.js';

const router = express.Router();

// ALL routes require authentication
router.use(protect);

// Main dashboard
router.get('/dashboard', getAnalyticsDashboard);

// PDF Report only (no CSV/JSON)
router.get('/export/pdf', exportSummaryPDF);

export default router;