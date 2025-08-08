const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

router.post('/', protect, createCategory);
router.get('/', getCategories);
router.put('/:id', protect, updateCategory);
router.delete('/:id', protect, deleteCategory);

module.exports = router;
