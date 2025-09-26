const Order = require("../../../Model/orderModel");
const ExcelJS = require('exceljs');

const generateSalesReport = async () => {
  const deliveredOrders = await Order.find({ orderStatus: 'Delivered' })
    .populate('userId')
    .populate('products.productId');

  if (deliveredOrders.length === 0) {
    throw new Error('No delivered orders found');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Delivered Orders Report');

  // Define columns
  worksheet.columns = [
    { header: 'Order ID', key: 'orderId', width: 20 },
    { header: 'User ID', key: 'userId', width: 20 },
    { header: 'Product ID', key: 'productId', width: 20 },
    { header: 'Product Name', key: 'productName', width: 30 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Size', key: 'size', width: 10 },
    { header: 'Total Amount', key: 'totalAmount', width: 15 },
    { header: 'Order Date', key: 'orderDate', width: 20 },
    { header: 'Delivery Date', key: 'deliveryDate', width: 20 },
    { header: 'Address Name', key: 'addressName', width: 20 },
    { header: 'Mobile', key: 'mobile', width: 15 },
    { header: 'Home Address', key: 'homeAddress', width: 30 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'District', key: 'district', width: 15 },
    { header: 'State', key: 'state', width: 15 },
    { header: 'Pincode', key: 'pincode', width: 10 },
    { header: 'Coupon Code', key: 'couponCode', width: 15 },
    { header: 'Discount Amount', key: 'discountAmount', width: 15 },
    { header: 'Order Status', key: 'orderStatus', width: 15 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Return Reason', key: 'returnReason', width: 25 },
  ];

  // Add data rows
  deliveredOrders.forEach(order => {
    const { address, coupon } = order;
    const deliveryDate = new Date().toLocaleDateString();

    order.products.forEach(product => {
      worksheet.addRow({
        orderId: order.orderId,
        userId: order.userId._id.toString(),
        productId: product.productId._id.toString(),
        productName: product.productId.name || 'N/A',
        quantity: product.quantity,
        size: product.size,
        totalAmount: order.totalAmount,
        orderDate: order.orderDate.toLocaleDateString(),
        deliveryDate: deliveryDate,
        addressName: address.addressName,
        mobile: address.mobile,
        homeAddress: address.homeAddress,
        city: address.city,
        district: address.district,
        state: address.state,
        pincode: address.pincode,
        couponCode: coupon?.couponCode || 'N/A',
        discountAmount: coupon?.discountAmount || 0,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        returnReason: order.returnReason || 'N/A',
      });
    });
  });

  return workbook;
};

module.exports = { generateSalesReport };