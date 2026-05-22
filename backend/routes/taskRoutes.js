import express from "express";
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  assignUserToTask,
  removeUserAssignment,
  addComment,
  getTaskDashboardStats
} from "../controllers/taskController.js";
import { protect } from "../middleware/authMiddleware.js";
import { deleteComment } from '../controllers/taskController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// ==================== TASK CRUD ROUTES ====================

// Create a new task
router.post("/", createTask);

// Get tasks with filtering and pagination
router.get("/", getTasks);

// Get task dashboard statistics
router.get("/dashboard", getTaskDashboardStats);


// ==================== SINGLE TASK OPERATIONS ====================

// Get single task
router.get("/:id", getTask);

// Update task
router.put("/:id", updateTask);

// Delete task
router.delete("/:id", deleteTask);
router.delete('/:id/comments/:commentId', deleteComment);

// ==================== TASK ASSIGNMENT ROUTES ====================

// Assign user to task
router.put("/:id/assign", assignUserToTask);

// Remove user assignment from task
router.put("/:id/unassign", removeUserAssignment);

// ==================== TASK COLLABORATION ROUTES ====================

// Add comment to task
router.post("/:id/comments", addComment);

export default router;