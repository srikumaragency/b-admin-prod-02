const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const {
  createSubcategory,
  getAllSubcategories,
  getSubcategoriesByCategory,
  updateSubcategory,
  deleteSubcategory,
} = require('../controllers/subcategoryController');

router.post('/', protect, createSubcategory);
router.get('/', getAllSubcategories);
router.get('/:categoryId', getSubcategoriesByCategory);
router.put('/:id', protect, updateSubcategory);
router.delete('/:id', protect, deleteSubcategory);

module.exports = router;
