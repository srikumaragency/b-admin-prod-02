// Test script to verify the pricing fix works
const axios = require('axios');
const FormData = require('form-data');

const API_BASE = 'http://localhost:5001/api';

async function testPricingFix() {
  console.log('🧪 Testing Profit Margin Price Fix...\n');

  try {
    // First, login to get auth token
    console.log('🔐 Logging in to get auth token...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'branch2@gmail.com',
      password: 'password123'
    });

    if (!loginResponse.data.token) {
      console.log('❌ Login failed:', loginResponse.data.message || 'No token received');
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful!');

    // Set up axios defaults with auth header
    const authHeaders = {
      'Authorization': `Bearer ${token}`
    };
    // Test Case 1: Create product with exact profitMarginPrice = 9.00
    console.log('Test Case 1: Creating product with profitMarginPrice = 9.00');
    
    const formData = new FormData();
    formData.append('productCode', 'TEST001');
    formData.append('name', 'Test Product - Pricing Fix');
    formData.append('description', 'Testing exact profit margin price preservation');
    formData.append('basePrice', '5.29');
    formData.append('profitMarginPercentage', '70');
    formData.append('profitMarginPrice', '9.00'); // EXACT value user typed
    formData.append('discountPercentage', '80');
    formData.append('categoryId', '6896113e198723a3b8c96dc8'); // COLOR MATCHES & ROLL CAP
    formData.append('subcategoryId', '688e7f7f7b9875a26fae6352'); // VEDI
    formData.append('inStock', 'true');
    formData.append('stockQuantity', '100');

    // Create a fake image file
    const fakeImageBuffer = Buffer.from('fake image data for testing');
    formData.append('images', fakeImageBuffer, {
      filename: 'test.jpg',
      contentType: 'image/jpeg'
    });

    const createResponse = await axios.post(`${API_BASE}/products`, formData, {
      headers: {
        ...formData.getHeaders(),
        ...authHeaders
      }
    });

    if (createResponse.data.success) {
      const product = createResponse.data.product;
      console.log('✅ Product created successfully!');
      console.log('📊 Pricing Results:');
      console.log(`   Input profitMarginPrice: 9.00`);
      console.log(`   Saved profitMarginPrice: ${product.profitMarginPrice}`);
      console.log(`   Saved offerPrice: ${product.offerPrice}`);
      console.log(`   Base Price: ${product.basePrice}`);
      console.log(`   Calculated Original Price: ${product.calculatedOriginalPrice}`);
      
      // Check if the exact value is preserved
      if (product.profitMarginPrice === 9.00 || product.profitMarginPrice === 9) {
        console.log('🎉 SUCCESS: Exact profitMarginPrice preserved!');
      } else {
        console.log('❌ FAILED: profitMarginPrice was changed from 9.00 to', product.profitMarginPrice);
      }

      // Test Case 2: Update the same product with profitMarginPrice = 14.01
      console.log('\nTest Case 2: Updating product with profitMarginPrice = 14.01');
      
      const updateFormData = new FormData();
      updateFormData.append('profitMarginPrice', '14.01');
      updateFormData.append('profitMarginPercentage', '70');
      updateFormData.append('discountPercentage', '80');

      const updateResponse = await axios.put(`${API_BASE}/products/${product._id}`, updateFormData, {
        headers: {
          ...updateFormData.getHeaders(),
          ...authHeaders
        }
      });

      if (updateResponse.data.success) {
        const updatedProduct = updateResponse.data.product;
        console.log('✅ Product updated successfully!');
        console.log('📊 Updated Pricing Results:');
        console.log(`   Input profitMarginPrice: 14.01`);
        console.log(`   Saved profitMarginPrice: ${updatedProduct.profitMarginPrice}`);
        console.log(`   Saved offerPrice: ${updatedProduct.offerPrice}`);
        
        // Check if the exact value is preserved
        if (updatedProduct.profitMarginPrice === 14.01) {
          console.log('🎉 SUCCESS: Exact profitMarginPrice preserved in update!');
        } else {
          console.log('❌ FAILED: profitMarginPrice was changed from 14.01 to', updatedProduct.profitMarginPrice);
        }
      }

      // Test Case 3: Update with profitMarginPrice = 200
      console.log('\nTest Case 3: Updating product with profitMarginPrice = 200');
      
      const updateFormData2 = new FormData();
      updateFormData2.append('profitMarginPrice', '200');
      updateFormData2.append('profitMarginPercentage', '70');
      updateFormData2.append('discountPercentage', '80');

      const updateResponse2 = await axios.put(`${API_BASE}/products/${product._id}`, updateFormData2, {
        headers: {
          ...updateFormData2.getHeaders(),
          ...authHeaders
        }
      });

      if (updateResponse2.data.success) {
        const updatedProduct2 = updateResponse2.data.product;
        console.log('✅ Product updated successfully!');
        console.log('📊 Updated Pricing Results:');
        console.log(`   Input profitMarginPrice: 200`);
        console.log(`   Saved profitMarginPrice: ${updatedProduct2.profitMarginPrice}`);
        console.log(`   Saved offerPrice: ${updatedProduct2.offerPrice}`);
        
        // Check if the exact value is preserved
        if (updatedProduct2.profitMarginPrice === 200) {
          console.log('🎉 SUCCESS: Exact profitMarginPrice preserved for 200!');
        } else {
          console.log('❌ FAILED: profitMarginPrice was changed from 200 to', updatedProduct2.profitMarginPrice);
        }
      }

      // Clean up - delete test product
      try {
        await axios.delete(`${API_BASE}/products/${product._id}`, {
          headers: authHeaders
        });
        console.log('\n🧹 Test product cleaned up');
      } catch (cleanupError) {
        console.log('⚠️ Could not clean up test product:', cleanupError.message);
      }

    } else {
      console.log('❌ Failed to create test product:', createResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testPricingFix();