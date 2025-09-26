const Order = require("../../../Model/orderModel");
const User = require("../../../Model/userModel");

const getPaginatedOrders = async (page = 1, limit = 8) => {
  const skip = (page - 1) * limit;

  const [orderedData, totalOrders] = await Promise.all([
    Order.find()
      .populate("userId")
      .populate("products.productId")
      .sort({ orderDate: -1 })
      .limit(limit)
      .skip(skip),
    Order.countDocuments()
  ]);

  const totalPages = Math.ceil(totalOrders / limit);

  return { orderedData, totalPages, totalOrders };
};

const getOrderDetails = async (orderId) => {
  return await Order.findOne({ _id: orderId })
    .populate("products.productId")
    .exec();
};

const updateOrderStatus = async (orderId, newStatus) => {
  const orderStatuses = ["Pending", "Order Placed", "Shipped", "Delivered", "Cancelled", "Returned"];
  
  if (!orderStatuses.includes(newStatus)) {
    throw new Error("Invalid order status");
  }

  const updatedOrder = await Order.findByIdAndUpdate(orderId, { orderStatus: newStatus });
  
  if (!updatedOrder) {
    throw new Error("Order not found");
  }

  return updatedOrder;
};

module.exports = { getPaginatedOrders, getOrderDetails, updateOrderStatus };