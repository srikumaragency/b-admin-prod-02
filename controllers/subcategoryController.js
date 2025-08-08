const Subcategory = require('../models/Subcategory');

// Create subcategory
exports.createSubcategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;
    const subcategory = new Subcategory({ name, categoryId });
    await subcategory.save();
    res.status(201).json(subcategory);
  } catch (error) {
    res.status(500).json({ message: 'Subcategory creation failed', error: error.message });
  }
};

// Get all subcategories (grouped by category)
exports.getAllSubcategories = async (req, res) => {
  try {
    const subcategories = await Subcategory.find().populate('categoryId', 'name');
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ message: 'Fetching subcategories failed', error: error.message });
  }
};

// Get subcategories for a specific category
exports.getSubcategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const subcategories = await Subcategory.find({ categoryId });
    res.json(subcategories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subcategories', error: error.message });
  }
};

// Edit subcategory
exports.updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId } = req.body;
    const subcategory = await Subcategory.findByIdAndUpdate(id, { name, categoryId }, { new: true });
    res.json(subcategory);
  } catch (error) {
    res.status(500).json({ message: 'Updating subcategory failed', error: error.message });
  }
};

// Delete subcategory
exports.deleteSubcategory = async (req, res) => {
  try {
    await Subcategory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subcategory deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Deleting subcategory failed', error: error.message });
  }
};
