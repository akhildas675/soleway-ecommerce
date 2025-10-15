const {createOrders} = require('../orderServices');
const {clearCart} = require('../../../utils/userUtils/cartUtils');

// Razorpay instance
const Razorpay = require("razorpay");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

const handleOnlinePayment = async (data) => {
  const {
    findCart,
    findAddress,
    userId,
    totalAmount,
    finalAmount,
    discountAmount,
    couponDetails,
    paymentMethod,
    paymentStatus,
    paymentId,
    initial
  } = data;
 
  // If initial request, create Razorpay order
  if (initial) {
    try {
      const onlineOrder = await instance.orders.create({
        amount: Math.round(finalAmount * 100), // Convert to paise
        currency: "INR",
        receipt: `order_${Date.now()}`,
        notes: {
          userId: userId.toString(),
          cartId: findCart._id.toString()
        }
      });
      
      // console.log('Razorpay order created - Amount:', onlineOrder.amount);
      
      return {
        success: true,
        message: "Payment initiated, awaiting payment confirmation",
        orderId: onlineOrder.id,
        amount: onlineOrder.amount,
      };
    } catch (razorpayError) {
      console.error('Razorpay order creation failed:', razorpayError);
      return {
        success: false,
        message: "Failed to initiate payment gateway",
        statusCode: 500
      };
    }
  }

  // Payment completion or failure handling
  let orderStatus, updateStock;
  
  if (paymentStatus === "Failed") {
    // Payment failed - create pending order
    orderStatus = "Pending";
    updateStock = false;
    console.log('Creating pending order due to payment failure');
    
  } else if (paymentStatus === "Received" && paymentId) {
    // Payment successful - create order and update stock
    orderStatus = "Order Placed";
    updateStock = true;
    // console.log('Creating confirmed order after successful payment');
    
  } else {
    return {
      success: false,
      message: "Invalid payment status or missing payment ID",
      statusCode: 400
    };
  }

  try {
    // Create orders
    const orderIds = await createOrders({
      findCart,
      findAddress,
      userId,
      totalAmount,
      discountAmount,
      couponDetails,
      paymentMethod,
      orderStatus,
      paymentStatus,
      paymentId: paymentId || null,
      updateStock
    });

    // Clear cart only after order creation
    await clearCart(userId);

    return {
      success: true,
      message: orderStatus === "Pending"
        ? "Order created with pending status. You can complete payment from order details."
        : "Order placed successfully!",
      orderIds,
      orderStatus,
      paymentStatus
    };
    
  } catch (error) {
    console.error('Error creating order:', error);
    return {
      success: false,
      message: "Failed to create order",
      statusCode: 500
    };
  }
};

module.exports = { handleOnlinePayment };