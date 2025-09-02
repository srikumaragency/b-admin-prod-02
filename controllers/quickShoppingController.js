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

// Remap quick shopping order using simple SNo mapping
// Accepts mappings for categories and/or products and applies globally
exports.remapQuickShoppingOrder = async (req, res) => {
  try {
    console.log('Remapping quick shopping order for admin:', req.admin?._id);

    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    const adminId = req.admin._id;
    const branch = req.admin.branch;

    const {
      categoryMapping,          // e.g., { "1": 10, "2": 1 }
      productMapping,           // GLOBAL product mapping: { "1": 10, "2": 1 }
      productMappingByCategory, // PER-CATEGORY mapping: { "<categoryId>": { "1": 10, "2": 1 } }
      keepUnmapped = true,
      sortAfterRemap = true
    } = req.body || {};

    if (!categoryMapping && !productMapping && !productMappingByCategory) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one mapping: categoryMapping, productMapping, or productMappingByCategory'
      });
    }

    // Helper to normalize mapping keys to numbers
    const normalizeMap = (map) => {
      if (!map) return null;
      const out = {};
      for (const [k, v] of Object.entries(map)) {
        if (v === undefined || v === null || v === '') continue;
        const nk = Number(k);
        const nv = Number(v);
        if (Number.isFinite(nk) && Number.isFinite(nv)) out[nk] = nv;
      }
      return out;
    };

    const cMap = normalizeMap(categoryMapping);
    const pMap = normalizeMap(productMapping);

    // Normalize per-category product mappings
    const pMapByCat = {};
    if (productMappingByCategory && typeof productMappingByCategory === 'object') {
      for (const [catId, mapping] of Object.entries(productMappingByCategory)) {
        pMapByCat[catId] = normalizeMap(mapping);
      }
    }

    // Load existing order or build default from current categories/products
    let quickShopping = await QuickShopping.findOne({ adminId }).lean();

    if (!quickShopping) {
      console.log('No custom order found. Building default order from categories/products...');
      const categories = await Category.find().sort({ name: 1 }).lean();
      const categoryOrder = [];
      let cIndex = 1;
      for (const category of categories) {
        const products = await Product.find({
          categoryId: category._id,
          $and: [
            {
              $or: [
                { isDeleted: { $exists: false } },
                { isDeleted: false },
                { isDeleted: null }
              ]
            },
            {
              $or: [
                { isActive: { $exists: false } },
                { isActive: true },
                { isActive: null }
              ]
            }
          ]
        })
        .select('_id name')
        .sort({ name: 1 })
        .lean();

        const mappedProducts = products.map((p, idx) => ({
          productId: p._id,
          serialNumber: idx + 1
        }));

        categoryOrder.push({
          categoryId: category._id,
          serialNumber: cIndex++,
          products: mappedProducts
        });
      }

      quickShopping = { adminId, branch, categoryOrder };
    }

    // Apply mappings
    const applyMap = (oldSN, map) => {
      if (!map) return oldSN;
      const mapped = map[Number(oldSN)];
      if (mapped === 0) return 0; // allow zero if explicitly set
      return mapped != null ? Number(mapped) : (keepUnmapped ? oldSN : oldSN);
    };

    // Validate uniqueness helper
    const ensureUnique = (arr, what) => {
      const set = new Set();
      for (const n of arr) {
        if (!Number.isFinite(n)) return `${what} has non-numeric SNo`;
        if (set.has(n)) return `${what} has duplicate SNo: ${n}`;
        set.add(n);
      }
      return null;
    };

    // Remap category serial numbers
    const categorySNs = quickShopping.categoryOrder.map(c => applyMap(c.serialNumber, cMap));
    const categoryErr = ensureUnique(categorySNs, 'Category order');
    if (categoryErr) {
      return res.status(400).json({ success: false, message: categoryErr });
    }

    quickShopping.categoryOrder = quickShopping.categoryOrder.map((c, i) => ({
      ...c,
      serialNumber: categorySNs[i],
      products: c.products?.length ? (() => {
        const mapForThisCategory = pMapByCat[c.categoryId?.toString?.() || c.categoryId] || pMap;
        const productSNs = c.products.map(p => applyMap(p.serialNumber, mapForThisCategory));
        const productErr = ensureUnique(productSNs, `Products in category ${c.categoryId}`);
        if (productErr) throw new Error(productErr);
        const remapped = c.products.map((p, idx) => ({ ...p, serialNumber: productSNs[idx] }));
        return sortAfterRemap ? remapped.sort((a, b) => a.serialNumber - b.serialNumber) : remapped;
      })() : []
    }));

    if (sortAfterRemap) {
      quickShopping.categoryOrder.sort((a, b) => a.serialNumber - b.serialNumber);
    }

    // Persist the result
    const saved = await QuickShopping.findOneAndUpdate(
      { adminId },
      { adminId, branch, categoryOrder: quickShopping.categoryOrder },
      { new: true, upsert: true }
    ).populate({ path: 'categoryOrder.categoryId', select: 'name' })
     .populate({ path: 'categoryOrder.products.productId', select: 'name productCode price offerPrice images basePrice profitMarginPrice' });

    res.json({
      success: true,
      message: 'Quick shopping order remapped successfully',
      data: saved.categoryOrder
    });
  } catch (error) {
    console.error('Error remapping quick shopping order:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error remapping quick shopping order'
    });
  }
};