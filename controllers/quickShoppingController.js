const QuickShopping = require('../models/QuickShopping');
const Category = require('../models/Category');
const Product = require('../models/Product');

// Get categories with all products (including subcategory products)
// This returns all categories and products in their DEFAULT order (no custom arrangement)
exports.getCategoriesWithProducts = async (req, res) => {
  try {
    console.log('🔍 Fetching categories with products in default order...');
    
    // Use the working aggregation approach that was used before
    const categoriesWithProducts = await Category.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'products'
        }
      },
      {
        $addFields: {
          products: {
            $filter: {
              input: '$products',
              as: 'product',
              cond: {
                $and: [
                  { $ne: ['$$product.isDeleted', true] },
                  { $ne: ['$$product.isActive', false] }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          products: {
            $map: {
              input: '$products',
              as: 'product',
              in: {
                _id: '$$product._id',
                name: '$$product.name',
                productCode: '$$product.productCode',
                price: '$$product.price',
                offerPrice: '$$product.offerPrice',
                images: '$$product.images',
                basePrice: '$$product.basePrice',
                profitMarginPrice: '$$product.profitMarginPrice',
                discountPercentage: '$$product.discountPercentage'
              }
            }
          }
        }
      },
      {
        $match: {
          'products.0': { $exists: true }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          products: 1
        }
      },
      { $sort: { name: 1 } }
    ]);
    
    console.log(`✅ Found ${categoriesWithProducts.length} categories with products`);
    
    // Log details for debugging
    categoriesWithProducts.forEach(cat => {
      console.log(`📂 ${cat.name}: ${cat.products.length} products`);
    });
    
    res.json({
      success: true,
      data: categoriesWithProducts,
      message: 'Categories and products fetched in default order'
    });
    
  } catch (error) {
    console.error('❌ Error in main query:', error);
    
    // Enhanced fallback - try to get products directly
    try {
      console.log('🔄 Trying enhanced fallback...');
      
      const categories = await Category.find().sort({ name: 1 }).lean();
      const categoriesWithProducts = [];
      
      for (const category of categories) {
        const products = await Product.find({ 
          categoryId: category._id,
          $or: [
            { isDeleted: { $exists: false } },
            { isDeleted: false },
            { isDeleted: null }
          ]
        })
        .select('_id name productCode price offerPrice images basePrice profitMarginPrice discountPercentage')
        .sort({ name: 1 })
        .lean();
        
        if (products.length > 0) {
          categoriesWithProducts.push({
            _id: category._id,
            name: category.name,
            products: products
          });
        }
      }
      
      console.log(`🔄 Fallback found ${categoriesWithProducts.length} categories with products`);
      
      res.json({
        success: true,
        data: categoriesWithProducts,
        message: 'Categories and products fetched using fallback method'
      });
      
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
      res.status(500).json({
        success: false,
        message: 'Error fetching categories with products',
        error: error.message
      });
    }
  }
};

// Get saved quick shopping order
// Returns saved custom arrangement or null if using default order
exports.getQuickShoppingOrder = async (req, res) => {
  try {
    console.log('Fetching saved quick shopping order for admin:', req.admin?._id);
    
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }
    
    const adminId = req.admin._id;
    
    // Use timeout and lean query for better performance
    const quickShopping = await QuickShopping.findOne({ adminId })
      .populate({
        path: 'categoryOrder.categoryId',
        select: 'name'
      })
      .populate({
        path: 'categoryOrder.products.productId',
        select: 'name productCode price offerPrice images basePrice profitMarginPrice'
      })
      .lean()
      .maxTimeMS(5000); // 5 second timeout
    
    if (!quickShopping) {
      console.log('No saved order found - using default order');
      return res.json({
        success: true,
        data: null,
        message: 'No custom order found - using default arrangement'
      });
    }
    
    console.log(`Found saved order with ${quickShopping.categoryOrder.length} categories`);
    
    res.json({
      success: true,
      data: quickShopping.categoryOrder,
      message: 'Custom order retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching quick shopping order:', error);
    
    // Return null instead of error to allow fallback to default order
    res.json({
      success: true,
      data: null,
      message: 'Using default arrangement due to timeout',
      fallback: true
    });
  }
};

// Save quick shopping order
// Saves custom arrangement to database, overriding default order
exports.saveQuickShoppingOrder = async (req, res) => {
  try {
    console.log('Saving quick shopping order for admin:', req.admin?._id);
    
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }
    
    const adminId = req.admin._id;
    const branch = req.admin.branch;
    const { categoryOrder } = req.body;
    
    // Validate the input
    if (!categoryOrder || !Array.isArray(categoryOrder)) {
      return res.status(400).json({
        success: false,
        message: 'Category order is required and must be an array'
      });
    }
    
    console.log(`Saving custom order with ${categoryOrder.length} categories`);
    
    // Check if this is an update or new creation
    const existingOrder = await QuickShopping.findOne({ adminId });
    const isUpdate = !!existingOrder;
    
    // Update or create quick shopping order
    const quickShopping = await QuickShopping.findOneAndUpdate(
      { adminId },
      {
        adminId,
        branch,
        categoryOrder
      },
      {
        new: true,
        upsert: true
      }
    );
    
    console.log(`Custom order ${isUpdate ? 'updated' : 'created'} successfully`);
    
    res.json({
      success: true,
      data: quickShopping,
      message: `Custom arrangement ${isUpdate ? 'updated' : 'saved'} successfully - now active as permanent order`,
      isUpdate
    });
  } catch (error) {
    console.error('Error saving quick shopping order:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving quick shopping order',
      error: error.message
    });
  }
};

// Reset quick shopping order
// Deletes saved custom arrangement and returns to default order
exports.resetQuickShoppingOrder = async (req, res) => {
  try {
    console.log('Resetting quick shopping order for admin:', req.admin?._id);
    
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }
    
    const adminId = req.admin._id;
    
    const deletedOrder = await QuickShopping.findOneAndDelete({ adminId });
    
    if (deletedOrder) {
      console.log(`Custom order deleted - returning to default arrangement`);
      res.json({
        success: true,
        message: 'Custom order reset successfully - now using default arrangement',
        data: { resetToDefault: true }
      });
    } else {
      console.log('No custom order found to delete');
      res.json({
        success: true,
        message: 'No custom order found - already using default arrangement',
        data: { resetToDefault: false }
      });
    }
  } catch (error) {
    console.error('Error resetting quick shopping order:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting quick shopping order',
      error: error.message
    });
  }
};