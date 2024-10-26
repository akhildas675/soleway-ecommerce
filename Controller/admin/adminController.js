const User = require("../../Model/userModel");
const Products = require("../../Model/productModel");
const Category = require("../../Model/categoryModel");
const Cart = require("../../Model/cartModel");
const Address = require("../../Model/addressModel");
const Order = require("../../Model/orderModel");
const bcrypt = require("bcrypt");
const { disconnect } = require("mongoose");
const { json } = require("body-parser");
const Coupon = require("../../Model/couponModel");
const Offer = require("../../Model/OfferModel");
const ExcelJS=require('exceljs')
const path=require('path');
const fs=require('fs')

const adminLogin = async (req, res) => {
  try {


    res.render("adminLogin", { message: null });

   
  } catch (error) {
    console.log(error);
  }
};
const verifyAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminData = await User.findOne({ email });

    if (adminData) {
      const passwordMatch = await bcrypt.compare(password, adminData.password);

      if (passwordMatch) {
        if (adminData.is_admin) {
          req.session.adminData = adminData._id;

          res.redirect("/admin/Home");
        } else {
          res.render("adminLogin", { message: "Access denied. Not an admin." });
        }
      } else {
        res.render("adminLogin", { message: "Incorrect password" });
      }
    } else {
      res.render("adminLogin", { message: "Admin not found" });
    }
  } catch (error) {
    console.error(error);
  }
};

const adminLoad = async (req, res) => {
  try {
    const orders = await Order.find();
    const categories = await Category.find();
    const products = await Products.find(); 

    const orderCountsByMonth = Array.from({ length: 12 }, () => 0);
    orders.forEach(order => {
      if (order.orderDate) { 
        const monthIndex = new Date(order.orderDate).getMonth();  
        orderCountsByMonth[monthIndex]++;
      }
    });

    const productCountsByMonth = Array.from({ length: 12 }, () => 0);
    products.forEach(product => {
      if (product.date) {
        const monthIndex = new Date(product.date).getMonth();
        productCountsByMonth[monthIndex]++;
      }
    });

    const orderCountsByYearData = await Order.aggregate([
      {
        $group: {
          _id: { $year: "$orderDate" },
          orderCount: { $sum: 1 }
        }
      },
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

    const productCountsByYearData = await Products.aggregate([
      {
        $group: {
          _id: { $year: "$date" },
          productCount: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const productCountsByYear = [];
    let currentYearIndex1 = 0;
    const currentYear1 = new Date().getFullYear();

    for (let i = 0; i < productCountsByYearData.length; i++) {
      const year = productCountsByYearData[i]._id;
      const productCount = productCountsByYearData[i].productCount;

      while (currentYear1 - 5 + currentYearIndex1 < year) {
        productCountsByYear.push(0);
        currentYearIndex1++;
      }

      productCountsByYear.push(productCount);
      currentYearIndex1++;
    }

    while (currentYear1 - 5 + currentYearIndex1 <= currentYear1 + 6) {
      productCountsByYear.push(0);
      currentYearIndex1++;
    }

    const totalAmountByYearData = await Order.aggregate([
      {
        $group: {
          _id: { $year: "$orderDate" },
          totalAmount: { $sum: { $toDouble: "$totalAmount" } }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const totalAmountByYear = [];
    let currentYearIndex2 = 0;
    const currentYear2 = new Date().getFullYear();

    for (let i = 0; i < totalAmountByYearData.length; i++) {
      const year = totalAmountByYearData[i]._id;
      const totalAmount = totalAmountByYearData[i].totalAmount;

      while (currentYear2 - 5 + currentYearIndex2 < year) {
        totalAmountByYear.push(0);
        currentYearIndex2++;
      }

      totalAmountByYear.push(totalAmount);
      currentYearIndex2++;
    }

    while (currentYear2 - 5 + currentYearIndex2 <= currentYear2 + 6) {
      totalAmountByYear.push(0);
      currentYearIndex2++;
    }

    const bestSellingProduct = await Order.aggregate([
      { $unwind: "$products" },  
      { 
        $group: { 
          _id: "$products.productId", 
          totalSales: { $sum: "$products.quantity" } 
        } 
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 },
      { 
        $lookup: { 
          from: "products", 
          localField: "_id", 
          foreignField: "_id", 
          as: "product" 
        } 
      },
      { $unwind: "$product" },
      { 
        $project: { 
          productName: "$product.productName", 
          totalSales: 1 
        } 
      }
    ]);

    const bestSellingCategories = await Order.aggregate([
      { $unwind: "$products" },
      { 
        $lookup: { 
          from: "products", 
          localField: "products.productId", 
          foreignField: "_id", 
          as: "productInfo" 
        } 
      },
      { $unwind: "$productInfo" },
      { 
        $lookup: { 
          from: "categories", 
          localField: "productInfo.categoryId", 
          foreignField: "_id", 
          as: "category" 
        } 
      },
      { $unwind: "$category" },
      { 
        $group: { 
          _id: "$category._id", 
          name: { $first: "$category.categoryName" }, 
          totalSales: { $sum: "$products.quantity" } 
        } 
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ]);

    const totalAmountByMonth = Array(12).fill(0);
    orders.forEach(order => {
      if (order.orderDate) {
        const monthIndex = new Date(order.orderDate).getMonth();
        const totalAmount = parseFloat(order.totalAmount);
        totalAmountByMonth[monthIndex] += totalAmount;
      }
    });

    res.render("dashboard", {
      orders,
      categories,
      orderCountsByMonth,
      productCountsByMonth,
      orderCountsByYear,
      productCountsByYear,
      bestSellingProduct,
      bestSellingCategories,
      totalAmountByMonth,
      totalAmountByYear
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error loading admin dashboard");
  }
};


const loadUsers = async (req, res) => {
  try {
    const userData = await User.find();

    res.render("users", { users: userData });
  } catch (error) {
    console.log(error);
  }
};

const userBlocking = async (req, res) => {
  try {
      const userId = req.query.id; 
      await User.findByIdAndUpdate(userId, { is_active: false });
      
     
      res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error blocking user' });
  }
};


const userUnblocking = async (req, res) => {
    try {
        const userId = req.query.id; 
        await User.findByIdAndUpdate(userId, { is_active: true });
        
       
        res.status(200).json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error unblocking user' });
    }
};


const adminLogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Unable to log out");
      }
    });
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
};


const loadCouponPage = async (req, res) => {
  try {
    const adminId = req.session.adminData;
    // console.log("admin",adminId)

    const findCoupon = await Coupon.find().sort({ createdAt: -1 });

    // console.log(findCoupon)
    res.render("coupon", { coupon: findCoupon });
  } catch (error) {
    console.log(error);
  }
};

const addCoupon = async (req, res) => {
  // console.log("addCoupon function is called");
  try {
    const {
      couponName,
      couponCode,
      minimumPurchase,
      discountInPercentage,
      expiryDate,
    } = req.body;

    let errors = [];

    if (!couponName || couponName.trim() === "") {
      errors.push("Please enter a valid coupon name");
    }

    if (!couponCode || couponCode.trim() === "") {
      errors.push("Please enter a valid coupon code.");
    } else if (couponCode.trim().length < 5 || couponCode.trim().length > 10) {
      errors.push("Coupon code must be between 5 and 10 characters long.");
    }

    let upperCaseCode = couponCode.toUpperCase();
    let upperCaseName=couponName.toUpperCase()

    if (!minimumPurchase || isNaN(minimumPurchase) || minimumPurchase <= 0) {
      errors.push("Please enter a valid minimum purchase amount.");
    }

    if (
      !discountInPercentage ||
      isNaN(discountInPercentage) ||
      discountInPercentage <= 0 ||
      discountInPercentage >= 50
    ) {
      errors.push(
        "Please enter a valid discount percentage (0 < discount < 50)."
      );
    }
    if (!expiryDate) {
      errors.push("Please enter the expiry date.");
    } else {
      const today = new Date();

      console.log("Today's date and time:", today);
      const expiry = new Date(expiryDate);

      if (expiry <= today) {
        errors.push("Expiry date must be a future date.");
      }
    }
    if (errors.length > 0) {
      return res.json({ success: false, errors });
    }
    const existingCoupon = await Coupon.findOne({ couponCode: upperCaseCode });
    if (existingCoupon) {
      return res.json({
        success: false,
        errors: ["Coupon code already exists. Please use a different code."],
      });
    }

    const newCoupon = new Coupon({
      couponName:upperCaseName,
      couponCode: upperCaseCode,
      minimumPurchase,
      discountInPercentage,
      expiryDate,
    });

    await newCoupon.save();

    // console.log("Coupon data from frontEnd", req.body);

    return res.json({ success: true, message: "Coupon added successfully" });
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Failed to add coupon" });
  }
};

const loadEditCoupon = async (req, res) => {
  try {
    const ok = req.query.id;
    // console.log(ok,'hey ')

    const findCoupon = await Coupon.findById(req.query.id);
    res.render("editCoupon", { coupon: findCoupon });
  } catch (error) {
    console.log(error);
  }
};

const editCoupon = async (req, res) => {
  try {
      console.log("Edit coupon worked");

      const {
          couponId,
          couponName,
          couponCode,
          minimumPurchase,
          discountInPercentage,
          expiryDate,
      } = req.body;

      console.log("this is from the edit req.body", req.body);

      let errors = [];

      // Validate inputs
      if (!couponName || couponName.trim() === "" || couponName.length < 3) {
          errors.push("Please Enter a valid Coupon Name");
      }
      if (!couponCode || couponCode.trim() === "") {
          errors.push("Please Enter a valid Coupon Code");
      } else if (couponCode.trim().length < 5 || couponCode.trim().length > 10) {
          errors.push("Coupon code must be between 5 and 10 characters long");
      }

      let upperCase = couponCode.toUpperCase();

      // Validate minimum purchase amount
      if (!minimumPurchase || isNaN(minimumPurchase) || minimumPurchase < 1000) {
          errors.push("Minimum purchase amount must be greater than 1000.");
      }
      if (
          !discountInPercentage ||
          isNaN(discountInPercentage) ||
          discountInPercentage <= 0 ||
          discountInPercentage >= 70
      ) {
          errors.push("Please enter a valid discount percentage between 0 and 70");
      }
      if (!expiryDate) {
          errors.push("Please enter the expiry date.");
      } else {
          const today = new Date();
          const expiry = new Date(expiryDate);
          if (expiry <= today) {
              errors.push("Expiry date must be a future date");
          }
      }
      if (errors.length > 0) {
          return res.json({ success: false, errors });
      }

      // Find the coupon by ID and update it
      await Coupon.findByIdAndUpdate(couponId, {
          couponName: couponName,
          couponCode: upperCase,
          minimumPurchase,
          discountInPercentage,
          expiryDate,
      });

      return res.json({ success: true, message: "Coupon Updated Successfully." });
  } catch (error) {
      console.log(error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const blockCoupon = async (req, res) => {
  try {
    const couponId = req.query.id;
    console.log("couponId", couponId);
    const couponBlock = await Coupon.findByIdAndUpdate(couponId, {
      isActive: false,
    });
    res.redirect("/admin/loadCoupon");
  } catch (error) {
    console.log(error);
  }
};

const unblockCoupon = async (req, res) => {
  try {
    const couponId = req.query.id;
    console.log("couponID for unblock", couponId);

    const couponUnblock = await Coupon.findByIdAndUpdate(couponId, {
      isActive: true,
    });
    res.redirect("/admin/loadCoupon");
  } catch (error) {
    console.log(error);
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.body;
    console.log("couponId for delete", couponId);

    await Coupon.findByIdAndDelete(couponId);

    res.json({ success: true, message: "Coupon deleted successfully." });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Failed to delete the coupon." });
  }
};

const adminOrderMng = async (req, res) => {
  try {
    const userId = req.session.userData;
    const page = parseInt(req.query.page) || 1;
    const limit = 8; 
    const skip = (page - 1) * limit; 

    const orderedData = await Order.find()
      .populate("userId")
      .populate("products.productId")
      .limit(limit)
      .skip(skip).sort({orderdate:-1}); 

    const totalOrders = await Order.countDocuments(); 
    const totalPages = Math.ceil(totalOrders / limit); 

    const findUser = await User.findById(userId);

    // console.log("Ordered Data:", orderedData);
    console.log("Total Pages:", totalPages);

    res.render("adminOrderList", { orderedData, findUser, page, totalPages });
  } catch (error) {
    console.log(error);
  }
};


const orderDetailsOfUser = async (req, res) => {
  try {
      // Get the order ID from the query parameters
      const orderId = req.query.id;
      console.log("Order ID:", orderId);
      
      // Retrieve user ID from session
      const userId = req.session.userData;
      console.log("User ID:", userId);
 
      const findUser = await User.findById(userId);

      const addresses = await Address.find({ userId: userId });

      const orderedData = await Order.findOne({ _id: orderId })
          .populate("products.productId") 
          .exec(); 

      if (!orderedData) {
          return res.status(404).send("Order not found");
      }

      console.log("Ordered Data for Detail Page:", orderedData);

    
      res.render("userOrderDetails", { 
          orderedData, 
          findUser, 
          addresses 
      });
  } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).send("Internal Server Error");
  }
};


const updateOrderStatus=async (req,res)=>{
  try {
    const {orderId,newStatus}=req.body;

    console.log("this data from user order status manage",req.body)

    const orderStatuses = ["Pending", "Order Placed", "Shipped", "Delivered", "Cancelled", "Returned"];
    if (!orderStatuses.includes(newStatus)) {
      return res.json({ success: false, message: "Invalid order status" });
    }
    const updateOrder=await Order.findByIdAndUpdate(orderId,{orderStatus:newStatus})

    if(!updateOrder){
      return res.json({ success: false, message: "Order not found" })
    }

    res.json({ success: true, message: "Order status updated", order: updateOrder });
    
  } catch (error) {
    console.log(error)
  }
}

const salesReport = async (req, res) => {
  try {
      
      const deliveredOrders = await Order.find({ orderStatus: 'Delivered' });

      if (deliveredOrders.length === 0) {
          return res.status(404).json({ message: 'No delivered orders found' });
      }

     
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Delivered Orders Report');

     
      worksheet.columns = [
          { header: 'Order ID', key: 'orderId', width: 20 },
          { header: 'User ID', key: 'userId', width: 20 },
          { header: 'Product ID', key: 'productId', width: 20 },
          { header: 'Quantity', key: 'quantity', width: 10 },
          { header: 'Size', key: 'size', width: 10 },
          { header: 'Total Amount', key: 'totalAmount', width: 15 },
          { header: 'Order Date', key: 'orderDate', width: 20 },
          { header: 'Delivery Date', key: 'deliveryDate', width: 20 }
      ];

     
      deliveredOrders.forEach(order => {
          const deliveryDate = new Date().toLocaleDateString();

          order.products.forEach(product => {
              worksheet.addRow({
                  orderId: order.orderId,
                  userId: order.userId,
                  productId: product.productId,
                  quantity: product.quantity,
                  size: product.size,
                  totalAmount: order.totalAmount,
                  orderDate: order.orderDate.toLocaleDateString(),
                  deliveryDate: deliveryDate,
              });
          });
      });

     
      const filePath = './reports/delivered_orders_report.xlsx';
      await workbook.xlsx.writeFile(filePath);
      
     +68
      res.status(200).json({
          message: 'Sales report generated successfully',
          filePath: filePath,
      });
  } catch (error) {
      console.error('Error generating sales report:', error);
      res.status(500).json({ message: 'Internal server error' });
  }
};
//------------------------------


module.exports = {
  adminLoad,
  loadUsers,
  adminLogout,
  userBlocking,
  userUnblocking,
  adminOrderMng,
  orderDetailsOfUser,
  adminLogin,
  verifyAdminLogin,
  loadCouponPage,
  addCoupon,
  loadEditCoupon,
  editCoupon,
  blockCoupon,
  unblockCoupon,
  deleteCoupon,
  updateOrderStatus,
  salesReport,
};
