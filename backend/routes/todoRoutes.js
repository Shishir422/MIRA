const express = require('express');
const router = express.Router();
const {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  reorderTodos,
  prioritizeTodosWithAI,
  chatWithAIForTodos
} = require('../controllers/todoController');
const { protect } = require('../middleware/authMiddleware');

// All todo routes are protected
router.get('/', protect, getTodos);
router.post('/', protect, createTodo);
router.put('/:id', protect, updateTodo);
router.delete('/:id', protect, deleteTodo);
router.post('/reorder', protect, reorderTodos);
router.post('/prioritize-ai', protect, prioritizeTodosWithAI);
router.post('/chat', protect, chatWithAIForTodos);

module.exports = router;

