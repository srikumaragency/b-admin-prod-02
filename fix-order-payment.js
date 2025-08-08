const axios = require('axios');

async function fixOrderPayment() {
  try {
    console.log('Fixing payment status for order ORD1753936085321652...');
    
    // Use the valid JWT token from the test files
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NzM4ZTE2ZDJhNDNjMmE2ODdhMDJiNCIsImJyYW5jaCI6ImJyYW5jaDIiLCJpYXQiOjE3NTM5Mzc0MjIsImV4cCI6MTc1NDU0MjIyMn0.HRoqQYav0eTdIjwSDBifLjY3-cychIU_8CuvRtunjzs';
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const orderId = 'ORD1753936085321652';
    
    // First, let's get the current order details
    console.log('1. Fetching current order details...');
    try {
      const orderResponse = await axios.get(
        `http://localhost:5001/api/orders/${orderId}`,
        { headers, timeout: 30000 }
      );
      console.log('Current order status:', {
        paymentStatus: orderResponse.data.data.paymentStatus,
        orderStatus: orderResponse.data.data.orderStatus,
        hasPaymentScreenshot: !!orderResponse.data.data.paymentDetails?.paymentScreenshot
      });
    } catch (error) {
      console.log('Could not fetch order details:', error.response?.data || error.message);
    }
    
    // Update payment status to 'paid' since customer has paid
    console.log('2. Updating payment status to "paid"...');
    const paymentUpdateData = {
      paymentStatus: 'paid',
      adminNotes: 'Payment confirmed - Customer reported payment completed. Fixed inconsistent status.'
    };
    
    const paymentResponse = await axios.put(
      `http://localhost:5001/api/orders/${orderId}/payment-status`,
      paymentUpdateData,
      { headers, timeout: 30000 }
    );
    
    console.log('✅ Payment status updated successfully:', paymentResponse.data);
    
    // Verify the fix
    console.log('3. Verifying the fix...');
    try {
      const verifyResponse = await axios.get(
        `http://localhost:5001/api/orders/${orderId}`,
        { headers, timeout: 30000 }
      );
      console.log('✅ Final order status:', {
        paymentStatus: verifyResponse.data.data.paymentStatus,
        orderStatus: verifyResponse.data.data.orderStatus,
        adminNotes: verifyResponse.data.data.adminNotes
      });
      
      if (verifyResponse.data.data.paymentStatus === 'paid' && 
          verifyResponse.data.data.orderStatus === 'confirmed') {
        console.log('🎉 Order status is now consistent! Payment: paid, Order: confirmed');
      } else {
        console.log('⚠️ Status may still be inconsistent. Please check manually.');
      }
    } catch (error) {
      console.log('Could not verify fix:', error.response?.data || error.message);
    }
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('❌ Request timed out');
    } else if (error.response) {
      console.log('❌ Server error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

// Run the fix
fixOrderPayment();