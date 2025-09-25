const {createOrders} = require('../orderServices');

const {clearCart} = require('../../../utils/user/cartUtils');


// Razorpay instance (you can move this to a separate config file)
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
    const onlineOrder = await instance.orders.create({
      amount: finalAmount * 100,
      currency: "INR",
    });

    return {
      success: true,
      message: "Payment initiated, awaiting payment confirmation",
      orderId: onlineOrder.id,
      amount: onlineOrder.amount,
    };
  }

  let orderStatus, updateStock;

  // Determine order status based on payment status
  if (paymentStatus === "Failed") {
    orderStatus = "Pending";
    updateStock = false;
  } else if (paymentStatus === "Received" && paymentId) {
    orderStatus = "Order Placed";
    updateStock = true;
  } else {
    return {
      success: false,
      message: "Invalid payment status",
      statusCode: 400
    };
  }

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
    updateStock
  });

  await clearCart(userId);

  return {
    success: true,
    message: orderStatus === "Pending" 
      ? "Order created with pending status, items removed from cart"
      : "Order created successfully after payment",
    orderIds
  };
};

module.exports = { handleOnlinePayment };