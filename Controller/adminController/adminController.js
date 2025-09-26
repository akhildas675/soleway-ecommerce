const User = require("../../Model/userModel");
const Address = require("../../Model/addressModel");

// Import services
const { authenticateAdmin } = require("../../helper/services/adminServices/authService");
const { getAllUsers, toggleUserStatus } = require("../../helper/services/adminServices/userManagementService");
const { 
  getDashboardData, 
  getYearlyOrderCounts, 
  getYearlyProductCounts, 
  getYearlyTotalAmounts, 
  getBestSellingProducts, 
  getBestSellingCategories 
} = require("../../helper/services/adminServices/dashboardService");
const {
  validateCouponData,
  validateEditCouponData,
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon
} = require("../../helper/services/adminServices/couponService");
const { getPaginatedOrders, getOrderDetails, updateOrderStatus } = require("../../helper/services/adminServices/orderManagementService");
const { generateSalesReport } = require("../../helper/services/adminServices/reportService");

// auth controller

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

    const result = await authenticateAdmin(email, password);

    if (!result.success) {
      return res.status(result.statusCode).json({ 
        success: false, 
        message: result.message 
      });
    }

    req.session.adminData = result.adminData._id;
    return res.status(200).json({ 
      success: true, 
      redirectUrl: "/admin/Home" 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

const adminLogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Unable to log out");
      }
      res.redirect("/");
    });
  } catch (error) {
    console.log(error);
  }
};

// dashboard

const adminLoad = async (req, res) => {
  try {
    const [
      dashboardData,
      orderCountsByYear,
      productCountsByYear,
      totalAmountByYear,
      bestSellingProduct,
      bestSellingCategories
    ] = await Promise.all([
      getDashboardData(),
      getYearlyOrderCounts(),
      getYearlyProductCounts(),
      getYearlyTotalAmounts(),
      getBestSellingProducts(),
      getBestSellingCategories()
    ]);

    res.render("dashboard", {
      ...dashboardData,
      orderCountsByYear,
      productCountsByYear,
      totalAmountByYear,
      bestSellingProduct,
      bestSellingCategories,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Error loading admin dashboard");
  }
};

//user management

const loadUsers = async (req, res) => {
  try {
    const userData = await getAllUsers();
    res.render("users", { users: userData });
  } catch (error) {
    console.log(error);
  }
};

const userBlocking = async (req, res) => {
  try {
    const userId = req.query.id;
    await toggleUserStatus(userId, false);
    res.status(200).json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error blocking user' });
  }
};

const userUnblocking = async (req, res) => {
  try {
    const userId = req.query.id;
    await toggleUserStatus(userId, true);
    res.status(200).json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error unblocking user' });
  }
};

// coupon management 

const loadCouponPage = async (req, res) => {
  try {
    const findCoupon = await getAllCoupons();
    res.render("coupon", { coupon: findCoupon });
  } catch (error) {
    console.log(error);
  }
};

const addCoupon = async (req, res) => {
  try {
    const errors = validateCouponData(req.body);

    if (errors.length > 0) {
      return res.json({ success: false, errors });
    }

    await createCoupon(req.body);
    return res.json({ success: true, message: "Coupon added successfully" });
  } catch (error) {
    console.log(error);
    if (error.message.includes("already exists")) {
      return res.json({
        success: false,
        errors: [error.message],
      });
    }
    return res.json({ success: false, message: "Failed to add coupon" });
  }
};

const loadEditCoupon = async (req, res) => {
  try {
    const findCoupon = await getCouponById(req.query.id);
    res.render("editCoupon", { coupon: findCoupon });
  } catch (error) {
    console.log(error);
  }
};

const editCoupon = async (req, res) => {
  try {
    const errors = validateEditCouponData(req.body);

    if (errors.length > 0) {
      return res.json({ success: false, errors });
    }

    const { couponId } = req.body;
    await updateCoupon(couponId, req.body);
    
    return res.json({ success: true, message: "Coupon Updated Successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const blockCoupon = async (req, res) => {
  try {
    const couponId = req.query.id;
    await toggleCouponStatus(couponId, false);
    res.redirect("/admin/loadCoupon");
  } catch (error) {
    console.log(error);
  }
};

const unblockCoupon = async (req, res) => {
  try {
    const couponId = req.query.id;
    await toggleCouponStatus(couponId, true);
    res.redirect("/admin/loadCoupon");
  } catch (error) {
    console.log(error);
  }
};

const deleteCouponController = async (req, res) => {
  try {
    const { couponId } = req.body;
    await deleteCoupon(couponId);
    res.json({ success: true, message: "Coupon deleted successfully." });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Failed to delete the coupon." });
  }
};

// order  management

const adminOrderMng = async (req, res) => {
  try {
    const userId = req.session.userData;
    const page = parseInt(req.query.page) || 1;

    const [{ orderedData, totalPages }, findUser] = await Promise.all([
      getPaginatedOrders(page),
      User.findById(userId)
    ]);

    res.render("adminOrderList", { orderedData, findUser, page, totalPages });
  } catch (error) {
    console.log(error);
  }
};

const orderDetailsOfUser = async (req, res) => {
  try {
    const orderId = req.query.id;
    const userId = req.session.userData;

    const [findUser, addresses, orderedData] = await Promise.all([
      User.findById(userId),
      Address.find({ userId }),
      getOrderDetails(orderId)
    ]);

    if (!orderedData) {
      return res.status(404).send("Order not found");
    }

    res.render("userOrderDetails", { orderedData, findUser, addresses });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Internal Server Error");
  }
};

const updateOrderStatusController = async (req, res) => {
  try {
    const { orderId, newStatus } = req.body;

    const updatedOrder = await updateOrderStatus(orderId, newStatus);
    res.json({ success: true, message: "Order status updated", order: updatedOrder });
  } catch (error) {
    console.log(error);
    
    if (error.message === "Invalid order status") {
      return res.json({ success: false, message: "Invalid order status" });
    }
    
    if (error.message === "Order not found") {
      return res.json({ success: false, message: "Order not found" });
    }
    
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// report controller

const salesReport = async (req, res) => {
  try {
    const workbook = await generateSalesReport();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=delivered_orders_report.xlsx');

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error('Error generating sales report:', error);
    
    if (error.message === 'No delivered orders found') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};



module.exports = {
  // Authentication
  adminLogin,
  verifyAdminLogin,
  adminLogout,
  
  // Dashboard
  adminLoad,
  
  // User Management
  loadUsers,
  userBlocking,
  userUnblocking,
  
  // Coupon Management
  loadCouponPage,
  addCoupon,
  loadEditCoupon,
  editCoupon,
  blockCoupon,
  unblockCoupon,
  deleteCoupon: deleteCouponController,
  
  // Order Management
  adminOrderMng,
  orderDetailsOfUser,
  updateOrderStatus: updateOrderStatusController,
  
  // Reports
  salesReport,
};