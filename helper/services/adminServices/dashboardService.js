const Order = require("../../../Model/orderModel");
const Category = require("../../../Model/categoryModel");
const Products = require("../../../Model/productModel");
const Feedback = require("../../../Model/feedback");

const getDashboardData = async () => {
  try {
    const [orders, categories, reviewedProducts, feedback] = await Promise.all([
      Order.find(),
      Category.find(),
      Products.find({ "review.0": { $exists: true } }).populate('review.userId', 'name'),
      Feedback.find().limit(5)
    ]);

    // Calculate monthly order counts
    const orderCountsByMonth = Array.from({ length: 12 }, () => 0);
    orders.forEach(order => {
      if (order.orderDate) {
        const monthIndex = new Date(order.orderDate).getMonth();
        orderCountsByMonth[monthIndex]++;
      }
    });

    // Calculate monthly product counts
    const productCountsByMonth = Array.from({ length: 12 }, () => 0);
    reviewedProducts.forEach(product => {
      if (product.date) {
        const monthIndex = new Date(product.date).getMonth();
        productCountsByMonth[monthIndex]++;
      }
    });

    // Calculate monthly total amounts
    const totalAmountByMonth = Array(12).fill(0);
    orders.forEach(order => {
      if (order.orderDate) {
        const monthIndex = new Date(order.orderDate).getMonth();
        const totalAmount = parseFloat(order.totalAmount);
        totalAmountByMonth[monthIndex] += totalAmount;
      }
    });

    return {
      orders,
      categories,
      reviewedProducts,
      feedback,
      orderCountsByMonth,
      productCountsByMonth,
      totalAmountByMonth
    };
  } catch (error) {
    console.error("Error getting dashboard data:", error);
    throw error;
  }
};

const getYearlyOrderCounts = async () => {
  const orderCountsByYearData = await Order.aggregate([
    { $group: { _id: { $year: "$orderDate" }, orderCount: { $sum: 1 } } },
    { $sort: { "_id": 1 } }
  ]);

  const orderCountsByYear = [];
  let currentYearIndex = 0;
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < orderCountsByYearData.length; i++) {
    const year = orderCountsByYearData[i]._id;
    const orderCount = orderCountsByYearData[i].orderCount;
    while (currentYear - 5 + currentYearIndex < year) {
      orderCountsByYear.push(0);
      currentYearIndex++;
    }
    orderCountsByYear.push(orderCount);
    currentYearIndex++;
  }
  while (currentYear - 5 + currentYearIndex <= currentYear + 6) {
    orderCountsByYear.push(0);
    currentYearIndex++;
  }

  return orderCountsByYear;
};

const getYearlyProductCounts = async () => {
  const productCountsByYearData = await Products.aggregate([
    { $group: { _id: { $year: "$date" }, productCount: { $sum: 1 } } },
    { $sort: { "_id": 1 } }
  ]);

  const productCountsByYear = [];
  let currentYearIndex = 0;
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < productCountsByYearData.length; i++) {
    const year = productCountsByYearData[i]._id;
    const productCount = productCountsByYearData[i].productCount;
    while (currentYear - 5 + currentYearIndex < year) {
      productCountsByYear.push(0);
      currentYearIndex++;
    }
    productCountsByYear.push(productCount);
    currentYearIndex++;
  }
  while (currentYear - 5 + currentYearIndex <= currentYear + 6) {
    productCountsByYear.push(0);
    currentYearIndex++;
  }

  return productCountsByYear;
};

const getYearlyTotalAmounts = async () => {
  const totalAmountByYearData = await Order.aggregate([
    { $group: { _id: { $year: "$orderDate" }, totalAmount: { $sum: { $toDouble: "$totalAmount" } } } },
    { $sort: { "_id": 1 } }
  ]);

  const totalAmountByYear = [];
  let currentYearIndex = 0;
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < totalAmountByYearData.length; i++) {
    const year = totalAmountByYearData[i]._id;
    const totalAmount = totalAmountByYearData[i].totalAmount;
    while (currentYear - 5 + currentYearIndex < year) {
      totalAmountByYear.push(0);
      currentYearIndex++;
    }
    totalAmountByYear.push(totalAmount);
    currentYearIndex++;
  }
  while (currentYear - 5 + currentYearIndex <= currentYear + 6) {
    totalAmountByYear.push(0);
    currentYearIndex++;
  }

  return totalAmountByYear;
};

const getBestSellingProducts = async () => {
  return await Order.aggregate([
    { $unwind: "$products" },
    { $group: { _id: "$products.productId", totalSales: { $sum: "$products.quantity" } } },
    { $sort: { totalSales: -1 } },
    { $limit: 10 },
    { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
    { $unwind: "$product" },
    { $project: { productName: "$product.productName", totalSales: 1 } }
  ]);
};

const getBestSellingCategories = async () => {
  return await Order.aggregate([
    { $unwind: "$products" },
    { $lookup: { from: "products", localField: "products.productId", foreignField: "_id", as: "productInfo" } },
    { $unwind: "$productInfo" },
    { $lookup: { from: "categories", localField: "productInfo.categoryId", foreignField: "_id", as: "category" } },
    { $unwind: "$category" },
    { $group: { _id: "$category._id", name: { $first: "$category.categoryName" }, totalSales: { $sum: "$products.quantity" } } },
    { $sort: { totalSales: -1 } },
    { $limit: 10 }
  ]);
};

module.exports = {
  getDashboardData,
  getYearlyOrderCounts,
  getYearlyProductCounts,
  getYearlyTotalAmounts,
  getBestSellingProducts,
  getBestSellingCategories
};