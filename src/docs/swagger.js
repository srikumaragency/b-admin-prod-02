const swaggerJsDoc = {
  openapi: "3.0.0",
  info: {
    title: "Crackers E-Commerce API",
    version: "1.0.0",
    description: "Admin Panel API Documentation (Auth, Banner, Category, Product)",
  },
  servers: [
    {
      url: "http://localhost:5001/api",
      description: "Local Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Product: {
        type: "object",
        required: ["productCode", "name", "basePrice", "categoryId", "subcategoryId"],
        properties: {
          productCode: { 
            type: "string", 
            description: "Unique product identifier (alphanumeric only, auto-converted to uppercase)",
            example: "ABC123"
          },
          name: { type: "string", description: "Product name" },
          description: { type: "string", description: "Product description" },
          // New pricing system
          basePrice: { 
            type: "number", 
            description: "Base cost price of the product",
            example: 1000
          },
          profitMarginPercentage: { 
            type: "number", 
            default: 65,
            description: "Profit margin percentage (default: 65%)",
            example: 65
          },
          discountPercentage: { 
            type: "number", 
            default: 81,
            description: "Display discount percentage (default: 81%)",
            example: 81
          },
          // Legacy fields (auto-calculated)
          price: { type: "number", description: "Calculated original price for display" },
          offerPrice: { type: "number", description: "Actual selling price (profit margin price)" },
          categoryId: { type: "string", description: "Category ID" },
          subcategoryId: { type: "string", description: "Subcategory ID" },
          inStock: { type: "boolean", default: true, description: "Stock availability" },
          stockQuantity: { type: "integer", default: 0, description: "Available stock quantity" },
          youtubeLink: { type: "string", description: "YouTube video link (optional)" },
          isActive: { type: "boolean", default: true, description: "Product active status" },
          bestSeller: { type: "boolean", default: false, description: "Best seller flag" },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Product tags (comma-separated string)"
          },
          // Inventory fields
          receivedDate: {
            type: "string",
            description: "Date when product was received (DD-MM-YYYY format, auto-generated if empty)",
            example: "15-07-2025"
          },
          caseQuantity: {
            type: "string",
            description: "Quantity per case description",
            example: "qty:100 box"
          },
          receivedCase: {
            type: "integer",
            description: "Number of cases received",
            example: 3
          },
          brandName: {
            type: "string",
            description: "Brand name of the product",
            example: "Ajantha fireworks"
          },
          totalAvailableQuantity: {
            type: "integer",
            description: "Total available quantity (calculated from cases × quantity)",
            example: 300
          },
          // Supplier fields
          supplierName: {
            type: "string",
            description: "Supplier name (optional)",
            example: "ABC Suppliers"
          },
          supplierPhone: {
            type: "string",
            description: "Supplier phone number (10 digits, optional)",
            example: "9876543210"
          },
          maxQuantityPerCustomer: {
            type: "integer",
            description: "Maximum quantity each customer can add to cart (optional, null for no limit)",
            example: 10,
            minimum: 1
          }
        }
      },
      ProductDetailed: {
        type: "object",
        properties: {
          _id: { type: "string", description: "Product unique identifier" },
          productCode: { type: "string", description: "Unique product code (uppercase alphanumeric)" },
          name: { type: "string", description: "Product name" },
          description: { type: "string", description: "Product description" },
          // New pricing system
          basePrice: { type: "number", description: "Base cost price" },
          profitMarginPercentage: { type: "number", description: "Profit margin percentage" },
          profitMarginPrice: { type: "number", description: "Price with profit margin" },
          discountPercentage: { type: "number", description: "Display discount percentage" },
          calculatedOriginalPrice: { type: "number", description: "Calculated original price for display" },
          offerPrice: { type: "number", description: "Actual selling price" },
          // Legacy field
          price: { type: "number", description: "Original price (same as calculatedOriginalPrice)" },
          categoryId: { 
            type: "object",
            properties: {
              _id: { type: "string" },
              name: { type: "string" }
            },
            description: "Category information"
          },
          subcategoryId: { 
            type: "object",
            properties: {
              _id: { type: "string" },
              name: { type: "string" }
            },
            description: "Subcategory information"
          },
          images: {
            type: "array",
            items: {
              type: "object",
              properties: {
                url: { type: "string", format: "uri", description: "Image URL" },
                publicId: { type: "string", description: "Cloudinary public ID" }
              }
            },
            description: "Product images"
          },
          inStock: { type: "boolean", description: "Stock availability" },
          stockQuantity: { type: "integer", description: "Available stock quantity" },
          youtubeLink: { type: "string", description: "YouTube video link (optional)" },
          isActive: { type: "boolean", description: "Product active status" },
          bestSeller: { type: "boolean", description: "Best seller flag" },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Product tags"
          },
          // Inventory fields
          receivedDate: { type: "string", description: "Date when product was received (DD-MM-YYYY)" },
          caseQuantity: { type: "string", description: "Quantity per case description" },
          receivedCase: { type: "integer", description: "Number of cases received" },
          brandName: { type: "string", description: "Brand name" },
          totalAvailableQuantity: { type: "integer", description: "Total available quantity" },
          // Supplier fields
          supplierName: { type: "string", description: "Supplier name" },
          supplierPhone: { type: "string", description: "Supplier phone number" },
          // Customer quantity limit
          maxQuantityPerCustomer: { type: "integer", description: "Maximum quantity per customer (null for no limit)" },
          createdAt: { type: "string", format: "date-time", description: "Creation timestamp" },
          updatedAt: { type: "string", format: "date-time", description: "Last update timestamp" },
          savings: { type: "number", description: "Amount saved if offer price exists" },
          savingsPercentage: { type: "number", description: "Percentage saved" },
          hasOffer: { type: "boolean", description: "Whether product has an offer" },
          finalPrice: { type: "number", description: "Final price (offer price or regular price)" },
          imageCount: { type: "integer", description: "Number of images" },
          tagCount: { type: "integer", description: "Number of tags" }
        }
      },
      ProductCodeAvailability: {
        type: "object",
        properties: {
          success: { type: "boolean", default: true, description: "Success flag" },
          productCode: { type: "string", description: "Product code checked (uppercase)" },
          isAvailable: { type: "boolean", description: "Whether the code is available" },
          message: { type: "string", description: "Availability message" }
        },
        example: {
          success: true,
          productCode: "ABC123",
          isAvailable: false,
          message: "Product code is already taken"
        }
      },
      Category: {
        type: "object",
        properties: {
          name: { type: "string" }
        }
      },
      Subcategory: {
        type: "object",
        properties: {
          name: { type: "string" },
          categoryId: { type: "string" }
        }
      },
      Banner: {
        type: "object",
        properties: {
          _id: { type: "string" },
          imageUrl: { type: "string", format: "uri" },
          publicId: { type: "string" },
          type: { 
            type: "string", 
            enum: ["landscape", "portrait"] 
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      BannerListResponse: {
        type: "object",
        properties: {
          banners: {
            type: "array",
            items: { $ref: "#/components/schemas/Banner" }
          },
          total: { type: "integer" },
          page: { type: "integer" },
          pages: { type: "integer" },
          hasNext: { type: "boolean" },
          hasPrev: { type: "boolean" }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Admin Login",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "JWT returned on successful login" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/categories": {
      post: {
        tags: ["Category"],
        summary: "Create category",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Category" },
            },
          },
        },
        responses: {
          201: { description: "Category created" },
        },
      },
      get: {
        tags: ["Category"],
        summary: "List all categories",
        responses: {
          200: { description: "Success" },
        },
      },
    },
    "/categories/{id}": {
      put: {
        tags: ["Category"],
        summary: "Update category",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Category" },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Category"],
        summary: "Delete category",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Deleted" } },
      },
    },
    "/subcategories": {
      post: {
        tags: ["Subcategory"],
        summary: "Create subcategory",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Subcategory" },
            },
          },
        },
        responses: { 201: { description: "Subcategory created" } },
      },
      get: {
        tags: ["Subcategory"],
        summary: "List all subcategories (with category)",
        responses: { 200: { description: "Success" } },
      },
    },
    "/subcategories/{categoryId}": {
      get: {
        tags: ["Subcategory"],
        summary: "Get subcategories by categoryId",
        parameters: [
          { name: "categoryId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Success" } },
      },
    },
    "/products": {
      post: {
        tags: ["Product"],
        summary: "Create product",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["productCode", "name", "basePrice", "categoryId", "subcategoryId", "images"],
                properties: {
                  productCode: { 
                    type: "string", 
                    description: "Unique product code (alphanumeric only)",
                    example: "ABC123"
                  },
                  name: { type: "string", description: "Product name" },
                  description: { type: "string", description: "Product description" },
                  // New pricing system
                  basePrice: { 
                    type: "number", 
                    description: "Base cost price of the product (required)",
                    example: 1000
                  },
                  profitMarginPercentage: { 
                    type: "number", 
                    default: 65,
                    description: "Profit margin percentage (default: 65%)",
                    example: 65
                  },
                  discountPercentage: { 
                    type: "number", 
                    default: 81,
                    description: "Display discount percentage (default: 81%)",
                    example: 81
                  },
                  // Legacy fields (optional, will be calculated)
                  price: { type: "number", description: "Legacy price field (auto-calculated)" },
                  offerPrice: { type: "number", description: "Legacy offer price (auto-calculated)" },
                  categoryId: { type: "string", description: "Category ID" },
                  subcategoryId: { type: "string", description: "Subcategory ID" },
                  inStock: { type: "boolean", default: true, description: "Stock availability" },
                  stockQuantity: { type: "integer", default: 0, description: "Available stock quantity" },
                  youtubeLink: { type: "string", description: "YouTube video link (optional)" },
                  isActive: { type: "boolean", default: true, description: "Product active status" },
                  bestSeller: { type: "boolean", default: false, description: "Best seller flag" },
                  tags: { type: "string", description: "Comma-separated tags" },
                  // Inventory fields
                  receivedDate: {
                    type: "string",
                    description: "Date when product was received (DD-MM-YYYY format, auto-generated if empty)",
                    example: "15-07-2025"
                  },
                  caseQuantity: {
                    type: "string",
                    description: "Quantity per case description",
                    example: "qty:100 box"
                  },
                  receivedCase: {
                    type: "integer",
                    description: "Number of cases received",
                    example: 3
                  },
                  brandName: {
                    type: "string",
                    description: "Brand name of the product",
                    example: "Ajantha fireworks"
                  },
                  totalAvailableQuantity: {
                    type: "integer",
                    description: "Total available quantity",
                    example: 300
                  },
                  // Supplier fields
                  supplierName: {
                    type: "string",
                    description: "Supplier name (optional)",
                    example: "ABC Suppliers"
                  },
                  supplierPhone: {
                    type: "string",
                    description: "Supplier phone number (10 digits, optional)",
                    example: "9876543210"
                  },
                  images: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    minItems: 1,
                    maxItems: 3,
                    description: "Product images (1-3 files required)"
                  },
                },
              },
            },
          },
        },
        responses: { 
          201: { 
            description: "Product created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", default: true },
                    message: { type: "string" },
                    product: { $ref: "#/components/schemas/ProductDetailed" }
                  }
                },
                example: {
                  success: true,
                  message: "Product created successfully",
                  product: {
                    _id: "687ab4d03facfb3ec6ffb9ed",
                    productCode: "101",
                    name: "LAXMI",
                    description: "BEST PRODUCT",
                    basePrice: 100,
                    profitMarginPercentage: 65,
                    profitMarginPrice: 165,
                    discountPercentage: 81,
                    calculatedOriginalPrice: 868.4210526315792,
                    offerPrice: 165,
                    price: 868.4210526315792,
                    categoryId: {
                      _id: "6876929e01f4d000003e1a45",
                      name: "NIGHT LIGHTS"
                    },
                    subcategoryId: {
                      _id: "687692a801f4d000003e1a4c",
                      name: "SPARKLES"
                    },
                    images: [
                      {
                        url: "https://res.cloudinary.com/demo/image/upload/v1/products/laxmi1.jpg",
                        publicId: "products/laxmi1"
                      }
                    ],
                    inStock: true,
                    stockQuantity: 300,
                    youtubeLink: "",
                    isActive: true,
                    bestSeller: false,
                    tags: ["fireworks", "diwali"],
                    receivedDate: "15-07-2025",
                    caseQuantity: "qty:100 box",
                    receivedCase: 3,
                    brandName: "Ajantha fireworks",
                    totalAvailableQuantity: 300,
                    supplierName: "ABC Suppliers",
                    supplierPhone: "9876543210",
                    createdAt: "2025-07-18T20:55:44.047Z",
                    updatedAt: "2025-07-18T20:55:44.047Z"
                  }
                }
              }
            }
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    errors: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "Validation error details"
                    }
                  }
                },
                examples: {
                  missingProductCode: {
                    summary: "Missing product code",
                    value: { message: "Product code is required" }
                  },
                  invalidProductCode: {
                    summary: "Invalid product code format",
                    value: { 
                      message: "Validation failed", 
                      errors: ["Product code must contain only letters and numbers"] 
                    }
                  },
                  missingImages: {
                    summary: "No images provided",
                    value: { message: "At least 1 image required" }
                  },
                  tooManyImages: {
                    summary: "Too many images",
                    value: { message: "Max 3 images allowed" }
                  }
                }
              }
            }
          },
          409: {
            description: "Product code already exists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" }
                  }
                },
                example: {
                  message: "Product code already exists. Please use a unique code."
                }
              }
            }
          },
          500: {
            description: "Product creation failed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        },
      },
      get: {
        tags: ["Product"],
        summary: "List products with filter/pagination",
        parameters: [
          { 
            name: "categoryId", 
            in: "query", 
            schema: { type: "string" },
            description: "Filter by category ID"
          },
          { 
            name: "subcategoryId", 
            in: "query", 
            schema: { type: "string" },
            description: "Filter by subcategory ID"
          },
          { 
            name: "tag", 
            in: "query", 
            schema: { type: "string" },
            description: "Filter by tag"
          },
          { 
            name: "bestSeller", 
            in: "query", 
            schema: { type: "string", enum: ["true", "false"] },
            description: "Filter best sellers"
          },
          { 
            name: "isActive", 
            in: "query", 
            schema: { type: "string", enum: ["true", "false"] },
            description: "Filter by active status"
          },
          { 
            name: "inStock", 
            in: "query", 
            schema: { type: "string", enum: ["true", "false"] },
            description: "Filter by stock availability"
          },
          { 
            name: "minStock", 
            in: "query", 
            schema: { type: "integer" },
            description: "Filter by minimum stock quantity"
          },
          { 
            name: "maxStock", 
            in: "query", 
            schema: { type: "integer" },
            description: "Filter by maximum stock quantity"
          },
          { 
            name: "search", 
            in: "query", 
            schema: { type: "string" },
            description: "Search in product name and product code"
          },
          { 
            name: "page", 
            in: "query", 
            schema: { type: "integer", default: 1 },
            description: "Page number for pagination"
          },
          { 
            name: "limit", 
            in: "query", 
            schema: { type: "integer", default: 10 },
            description: "Number of items per page"
          },
        ],
        responses: { 
          200: { 
            description: "List of products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", default: true },
                    products: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ProductDetailed" }
                    },
                    total: { type: "integer", description: "Total number of products matching the filter" },
                    page: { type: "integer", description: "Current page number" },
                    pages: { type: "integer", description: "Total number of pages" }
                  }
                }
              }
            }
          },
          500: {
            description: "Error fetching products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", default: false },
                    message: { type: "string" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        },
      },
    },
    "/products/{id}": {
      get: {
        tags: ["Product"],
        summary: "Get product by ID - Detailed view",
        description: "Retrieve a single product with all details including images, category, subcategory, and calculated fields like savings and final price",
        parameters: [
          { 
            name: "id", 
            in: "path", 
            required: true, 
            schema: { type: "string" },
            description: "Product unique identifier (MongoDB ObjectId)"
          }
        ],
        responses: {
          200: {
            description: "Product details retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", description: "Success flag" },
                    product: { $ref: "#/components/schemas/ProductDetailed" }
                  }
                },
                example: {
                  success: true,
                  product: {
                    _id: "60d21b4667d0d8992e610c85",
                    productCode: "PWH2024",
                    name: "Premium Wireless Headphones",
                    description: "High-quality wireless headphones with noise cancellation",
                    price: 299.99,
                    offerPrice: 249.99,
                    categoryId: {
                      _id: "60d21b4667d0d8992e610c80",
                      name: "Electronics"
                    },
                    subcategoryId: {
                      _id: "60d21b4667d0d8992e610c81",
                      name: "Audio"
                    },
                    images: [
                      {
                        url: "https://res.cloudinary.com/demo/image/upload/v1/products/headphones1.jpg",
                        publicId: "products/headphones1"
                      },
                      {
                        url: "https://res.cloudinary.com/demo/image/upload/v1/products/headphones2.jpg",
                        publicId: "products/headphones2"
                      }
                    ],
                    inStock: true,
                    stockQuantity: 25,
                    youtubeLink: "https://www.youtube.com/watch?v=example",
                    isActive: true,
                    bestSeller: true,
                    tags: ["wireless", "noise-cancelling", "premium"],
                    createdAt: "2023-06-22T10:30:00.000Z",
                    updatedAt: "2023-06-22T15:45:00.000Z",
                    savings: 50,
                    savingsPercentage: 17,
                    hasOffer: true,
                    finalPrice: 249.99,
                    imageCount: 2,
                    tagCount: 3
                  }
                }
              }
            }
          },
          400: {
            description: "Invalid product ID format",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" }
                  }
                },
                example: {
                  message: "Invalid product ID format"
                }
              }
            }
          },
          404: {
            description: "Product not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" }
                  }
                },
                example: {
                  message: "Product not found"
                }
              }
            }
          },
          500: {
            description: "Failed to fetch product details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        }
      },
      put: {
        tags: ["Product"],
        summary: "Update product (with image support)",
        description: "Update product details including images. Only fields that need to be updated should be sent. Existing data will be preserved for fields not included in the request.",
        security: [{ bearerAuth: [] }],
        parameters: [{ 
          name: "id", 
          in: "path", 
          required: true, 
          schema: { type: "string" },
          description: "Product ID to update"
        }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  productCode: { 
                    type: "string", 
                    description: "Unique product code (alphanumeric only)",
                    example: "ABC123"
                  },
                  name: { type: "string", description: "Product name" },
                  description: { type: "string", description: "Product description" },
                  price: { type: "number", description: "Product price" },
                  offerPrice: { type: "number", description: "Discounted price (optional)" },
                  categoryId: { type: "string", description: "Category ID" },
                  subcategoryId: { type: "string", description: "Subcategory ID" },
                  inStock: { type: "boolean", description: "Stock availability" },
                  stockQuantity: { type: "integer", description: "Available stock quantity" },
                  youtubeLink: { type: "string", description: "YouTube video link (optional)" },
                  isActive: { type: "boolean", description: "Product active status" },
                  bestSeller: { type: "boolean", description: "Best seller flag" },
                  tags: { type: "string", description: "Comma-separated tags" },
                  removeImages: { 
                    type: "string", 
                    description: "Comma-separated list of image publicIds to remove" 
                  },
                  images: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                    description: "New product images to add (max 3 total including existing)"
                  },
                }
              }
            }
          }
        },
        responses: { 
          200: { 
            description: "Product updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", default: true },
                    message: { type: "string" },
                    product: { $ref: "#/components/schemas/ProductDetailed" }
                  }
                }
              }
            }
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    errors: { 
                      type: "array", 
                      items: { type: "string" }
                    }
                  }
                }
              }
            }
          },
          404: {
            description: "Product not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" }
                  }
                },
                example: {
                  message: "Product not found"
                }
              }
            }
          },
          409: {
            description: "Product code already exists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" }
                  }
                },
                example: {
                  message: "Product code already exists. Please use a unique code."
                }
              }
            }
          }
        },
      },
      delete: {
        tags: ["Product"],
        summary: "Delete product",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        security: [{ bearerAuth: [] }],
        responses: { 
          200: { 
            description: "Product deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", default: true },
                    message: { type: "string", example: "Product deleted successfully" }
                  }
                }
              }
            }
          },
          404: {
            description: "Product not found",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", default: false },
                    message: { type: "string", example: "Product not found" }
                  }
                }
              }
            }
          },
          500: {
            description: "Delete failed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", default: false },
                    message: { type: "string", example: "Delete failed" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        },
      },
    },
    "/products/check-code/{productCode}": {
      get: {
        tags: ["Product"],
        summary: "Check product code availability",
        description: "Check if a product code is available for use. Returns availability status and message.",
        parameters: [
          { 
            name: "productCode", 
            in: "path", 
            required: true, 
            schema: { type: "string" },
            description: "Product code to check (will be converted to uppercase)",
            example: "ABC123"
          }
        ],
        responses: {
          200: {
            description: "Product code availability check completed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProductCodeAvailability" },
                examples: {
                  available: {
                    summary: "Code is available",
                    value: {
                      success: true,
                      productCode: "ABC123",
                      isAvailable: true,
                      message: "Product code is available"
                    }
                  },
                  taken: {
                    summary: "Code is already taken",
                    value: {
                      success: true,
                      productCode: "XYZ789",
                      isAvailable: false,
                      message: "Product code is already taken"
                    }
                  }
                }
              }
            }
          },
          400: {
            description: "Invalid request",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" }
                  }
                },
                example: {
                  message: "Product code is required"
                }
              }
            }
          },
          500: {
            description: "Server error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/products/dashboard/stats": {
      get: {
        tags: ["Product"],
        summary: "Get dashboard product statistics",
        description: "Retrieve comprehensive statistics for the admin dashboard including product counts, stock status, and pricing information",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Dashboard statistics retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", default: true },
                    stats: {
                      type: "object",
                      properties: {
                        totalProducts: { type: "integer", description: "Total number of products" },
                        bestSellers: { type: "integer", description: "Number of products marked as best sellers" },
                        outOfStock: { type: "integer", description: "Number of products that are out of stock" },
                        inStock: { type: "integer", description: "Number of products that are in stock" },
                        productsWithOffer: { type: "integer", description: "Number of products with offer price" },
                        activeProducts: { type: "integer", description: "Number of active products" },
                        inactiveProducts: { type: "integer", description: "Number of inactive products" },
                        totalStock: { type: "integer", description: "Total stock quantity across all products" },
                        productsOriginalPrice: { type: "number", description: "Total value of all products at original price" }
                      }
                    }
                  }
                },
                example: {
                  success: true,
                  stats: {
                    totalProducts: 150,
                    bestSellers: 25,
                    outOfStock: 12,
                    inStock: 138,
                    productsWithOffer: 45,
                    activeProducts: 142,
                    inactiveProducts: 8,
                    totalStock: 3250,
                    productsOriginalPrice: 125000
                  }
                }
              }
            }
          },
          401: {
            description: "Unauthorized - Invalid or missing token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" }
                  }
                }
              }
            }
          },
          500: {
            description: "Failed to fetch dashboard statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        },
      },
    },
    "/products/stats/categories": {
      get: {
        tags: ["Product"],
        summary: "Get product counts by category and subcategory",
        description: "Retrieve aggregated product counts by category and subcategory for efficient frontend display",
        responses: {
          200: {
            description: "Category statistics retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { 
                      type: "boolean", 
                      default: true,
                      description: "Success flag" 
                    },
                    totalProducts: { 
                      type: "integer", 
                      description: "Total number of products in the system" 
                    },
                    categoryCounts: {
                      type: "array",
                      description: "List of categories with their product counts",
                      items: {
                        type: "object",
                        properties: {
                          _id: { 
                            type: "string", 
                            description: "Category ID" 
                          },
                          categoryId: { 
                            type: "string", 
                            description: "Category ID (duplicate for convenience)" 
                          },
                          categoryName: { 
                            type: "string", 
                            description: "Name of the category" 
                          },
                          totalProducts: { 
                            type: "integer", 
                            description: "Total number of products in this category" 
                          },
                          directProducts: { 
                            type: "integer", 
                            description: "Products directly in this category (not in subcategories)" 
                          },
                          subcategoryProducts: { 
                            type: "integer", 
                            description: "Products in subcategories of this category" 
                          }
                        }
                      }
                    },
                    subcategoryCounts: {
                      type: "array",
                      description: "List of subcategories with their product counts",
                      items: {
                        type: "object",
                        properties: {
                          _id: { 
                            type: "string", 
                            description: "Subcategory ID" 
                          },
                          subcategoryId: { 
                            type: "string", 
                            description: "Subcategory ID (duplicate for convenience)" 
                          },
                          subcategoryName: { 
                            type: "string", 
                            description: "Name of the subcategory" 
                          },
                          categoryId: { 
                            type: "string", 
                            description: "ID of the parent category" 
                          },
                          categoryName: { 
                            type: "string", 
                            description: "Name of the parent category" 
                          },
                          productCount: { 
                            type: "integer", 
                            description: "Number of products in this subcategory" 
                          }
                        }
                      }
                    }
                  }
                },
                example: {
                  totalProducts: 120,
                  categoryCounts: [
                    {
                      "_id": "60d21b4667d0d8992e610c85",
                      "categoryId": "60d21b4667d0d8992e610c85",
                      "categoryName": "Electronics",
                      "totalProducts": 45,
                      "directProducts": 10,
                      "subcategoryProducts": 35
                    },
                    {
                      "_id": "60d21b4667d0d8992e610c86",
                      "categoryId": "60d21b4667d0d8992e610c86",
                      "categoryName": "Clothing",
                      "totalProducts": 75,
                      "directProducts": 25,
                      "subcategoryProducts": 50
                    }
                  ],
                  subcategoryCounts: [
                    {
                      "_id": "60d21b4667d0d8992e610c90",
                      "subcategoryId": "60d21b4667d0d8992e610c90",
                      "subcategoryName": "Smartphones",
                      "categoryId": "60d21b4667d0d8992e610c85",
                      "categoryName": "Electronics",
                      "productCount": 20
                    },
                    {
                      "_id": "60d21b4667d0d8992e610c91",
                      "subcategoryId": "60d21b4667d0d8992e610c91",
                      "subcategoryName": "Laptops",
                      "categoryId": "60d21b4667d0d8992e610c85",
                      "categoryName": "Electronics",
                      "productCount": 15
                    }
                  ]
                }
              }
            }
          },
          500: {
            description: "Failed to fetch category statistics",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        },
      },
    },
    "/banners": {
      get: {
        tags: ["Banner"],
        summary: "List all banners with pagination and filtering",
        parameters: [
          {
            name: "type",
            in: "query",
            description: "Filter by banner type",
            required: false,
            schema: {
              type: "string",
              enum: ["landscape", "portrait"]
            }
          },
          {
            name: "page",
            in: "query",
            description: "Page number (default: 1)",
            required: false,
            schema: {
              type: "integer",
              minimum: 1,
              default: 1
            }
          },
          {
            name: "limit",
            in: "query",
            description: "Items per page (default: 10)",
            required: false,
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 10
            }
          }
        ],
        responses: {
          200: {
            description: "List of banners retrieved successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BannerListResponse" },
                example: {
                  banners: [
                    {
                      _id: "507f1f77bcf86cd799439011",
                      imageUrl: "https://res.cloudinary.com/example/image/upload/v1234567890/banners/sample.jpg",
                      publicId: "banners/sample",
                      type: "landscape",
                      createdAt: "2024-01-15T10:30:00.000Z",
                      updatedAt: "2024-01-15T10:30:00.000Z"
                    },
                    {
                      _id: "507f1f77bcf86cd799439012",
                      imageUrl: "https://res.cloudinary.com/example/image/upload/v1234567891/banners/sample2.jpg",
                      publicId: "banners/sample2",
                      type: "portrait",
                      createdAt: "2024-01-14T09:15:00.000Z",
                      updatedAt: "2024-01-14T09:15:00.000Z"
                    }
                  ],
                  total: 15,
                  page: 1,
                  pages: 2,
                  hasNext: true,
                  hasPrev: false
                }
              }
            }
          },
          500: {
            description: "Failed to fetch banners",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    error: { type: "string" }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Banner"],
        summary: "Upload banner images (max 5)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  banners: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                  },
                  type: {
                    type: "string",
                    enum: ["landscape", "portrait"],
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Uploaded" } },
      },
    },
    "/banners/{id}": {
      put: {
        tags: ["Banner"],
        summary: "Replace banner image",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  banner: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
      delete: {
        tags: ["Banner"],
        summary: "Delete banner",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Deleted" } },
      },
    },
  },
};

module.exports = swaggerJsDoc;
