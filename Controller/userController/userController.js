const User = require("../../Model/userModel");
const Category = require("../../Model/categoryModel");
const Products = require("../../Model/productModel");
const Address = require("../../Model/addressModel");
const Order = require("../../Model/orderModel");
const Wallet = require("../../Model/walletModel");
const Coupon = require("../../Model/couponModel");
const Feedback = require("../../Model/feedback");

// Import services
const { validateUserRegistration, validateAddress, validateFeedback } = require("../../helper/utils/userUtils/validationUtils");
const { generateOTP, sendOTPEmail, sendPasswordResetOTP } = require("../../helper/utils/userUtils/emailUtils");
const { getCommonPageData } = require("../../helper/services/user/userDataService");
const { getActiveProducts, getNewArrivals, getProductWithDetails, getRelatedProducts, searchAndFilterProducts } = require("../../helper/services/user/productService");
const { createUser, authenticateUser, updateUserPassword } = require("../../helper/services/user/authService");
const { createRazorpayOrder, processWalletPayment } = require("../../helper/services/user/walletService");

// Page loading controllers

const loadHome = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { findUser, cartCount, wishlistCount, userWishlist } = await getCommonPageData(userId);
    
    const [categories, products, newArrivals] = await Promise.all([
      Category.find({ is_active: true }),
      getActiveProducts(8),
      getNewArrivals(3)
    ]);

    res.status(200).render("index", {
      findUser,
      categories,
      products,
      newArrival: newArrivals,
      wishlist: userWishlist,
      cartCount,
      wishlistCount
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const loadAbout = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { findUser, cartCount, wishlistCount, userWishlist } = await getCommonPageData(userId);
    
    const categories = await Category.find({ is_active: true });

    res.status(200).render("about", {
      findUser,
      categories,
      wishlist: userWishlist,
      cartCount,
      wishlistCount
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const loadBlog = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { findUser, cartCount, wishlistCount, userWishlist } = await getCommonPageData(userId);
    
    const [categories, newArrivals, products] = await Promise.all([
      Category.find({ is_active: true }),
      getNewArrivals(6),
      getActiveProducts(8)
    ]);

    res.render('blog', {
      findUser,
      categories,
      wishlist: userWishlist,
      cartCount,
      wishlistCount,
      newArrivals,
      products
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const loadContact = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { findUser, cartCount, wishlistCount, userWishlist } = await getCommonPageData(userId);
    
    const categories = await Category.find({ is_active: true });

    res.render('contact', {
      findUser,
      categories,
      wishlist: userWishlist,
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};


// Add these new controller functions to your existing userController.js

const loadOrders = async (req, res) => {
  try {
    const userId = req.session.userData;
    
    if (!userId) {
      return res.redirect('/Login');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 4; // 4 orders per page
    const skip = (page - 1) * limit;

    const [findUser, orderedData, totalOrders] = await Promise.all([
      User.findById(userId),
      Order.find({ userId })
        .populate("products.productId")
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ userId })
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    res.render("orders", {
      findUser,
      orderedData,
      currentPage: page,
      totalPages,
      totalOrders
    });
  } catch (error) {
    console.error('Error loading orders page:', error);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const loadWallet = async (req, res) => {
  try {
    const userId = req.session.userData;
    
    if (!userId) {
      return res.redirect('/Login');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 8; // 8 transactions per page
    const skip = (page - 1) * limit;

    const [findUser, wallet] = await Promise.all([
      User.findById(userId),
      Wallet.findOne({ userId })
    ]);

    let transactions = [];
    let totalPages = 0;
    let totalTransactions = 0;

    if (wallet && wallet.history && wallet.history.length > 0) {
      // Sort transactions by date (newest first)
      const sortedHistory = wallet.history.sort((a, b) => 
        new Date(b.transactionDate) - new Date(a.transactionDate)
      );
      
      totalTransactions = sortedHistory.length;
      totalPages = Math.ceil(totalTransactions / limit);
      
      // Get paginated transactions
      transactions = sortedHistory.slice(skip, skip + limit);
    }

    res.render("wallet", {
      findUser,
      wallet,
      transactions,
      currentPage: page,
      totalPages,
      totalTransactions
    });
  } catch (error) {
    console.error('Error loading wallet page:', error);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

// Error page controllers

const render404 = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { findUser, cartCount, wishlistCount } = await getCommonPageData(userId);
    
    res.status(404).render("user/404", {
      findUser,
      cartCount,
      wishlistCount
    });
  } catch (error) {
    console.error("Error rendering 404:", error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const render500 = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { findUser, cartCount, wishlistCount } = await getCommonPageData(userId);
    
    res.status(500).render("user/500", {
      findUser,
      cartCount,
      wishlistCount
    });
  } catch (error) {
    console.error("Error rendering 500:", error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

// Auth controllers

const loadRegister = async (req, res) => {
  try {
    res.status(200).render("userRegister");
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const insertUser = async (req, res) => {
  try {
    const errors = validateUserRegistration(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        errors: ["An account with this email already exists. Please login."],
      });
    }

    req.session.data = req.body;
    res.status(200).json({
      message: "Registration successful! Please verify your account via OTP.",
      redirect: "/otpGet",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ errors: ["Server error. Please try again later."] }); 
  }
};

const otpGet = async (req, res) => {
  try {
    const otp = generateOTP();
    req.session.otp = otp;

    const { email, name } = req.session.data;
    await sendOTPEmail(email, name, otp);
    
    res.status(200).render("userOtp", { message: "" });
  } catch (error) {
    console.error("Error sending email: ", error);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (req.session.otp === otp) {
      const userData = await createUser(req.session.data);

      if (userData) {
        req.session.user = userData._id;
        delete req.session.otp;
        res.status(200).render("userLogin");
      } else {
        res.render("userOtp", {
          message: "There was an issue registering your account. Please try again.",
        });
      }
    } else {
      res.render("userOtp", { message: "Invalid OTP, please try again." });
    }
  } catch (error) {
    console.error("Error verifying OTP: ", error);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const loadLogin = async (req, res) => {
  try {
    res.status(200).render("userLogin");
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: `${!email ? 'Email' : 'Password'} is required.` 
      });
    }

    const result = await authenticateUser(email, password);
    
    if (!result.success) {
      return res.status(result.message.includes('blocked') ? 403 : 400)
        .json({ message: result.message });
    }

    req.session.userData = result.user._id;
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An internal server error occurred" });
  }
};

const googleAuth = async (req, res) => {
  try {
    const googleUser = req.user;
    const email = googleUser.emails[0].value;

    const findUser = await User.findOne({ email: email, is_active: true });

    if (!findUser) {
      return res.status(403).send("Your account is inactive or blocked. Please contact support.");
    }

    req.session.userData = findUser;
    res.redirect("/");
  } catch (error) {
    console.log("Error during Google Authentication:", error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const userLogOut = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err.message);
        return res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
      }
      res.status(200).redirect("/");
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

// Password reset controllers

const verifyEmail = async (req, res) => {
  try {
    res.status(200).render("emailVerify");
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const resetPassword = async (req, res) => {
  try {
    const matchEmail = await User.findOne({ email: req.body.email });
    if (matchEmail) {
      req.session.email = req.body.email;
      res.status(200).redirect("/userNewOtp");
    } else {
      res.render("emailVerify", {
        message: "You have no account, please register",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const resetPasswordOtp = async (req, res) => {
  try {
    const userData = await User.findOne({ email: req.session.email });
    const otp = generateOTP();
    req.session.resetPOtp = otp;

    await sendPasswordResetOTP(req.session.email, userData.name, otp);
    res.status(200).render("passwordOtp");
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const resetOtp = req.body.otp;
    if (req.session.resetPOtp === resetOtp) {
      res.status(200).render("resetPassword");
    } else {
      res.render("passwordOtp", { message: "Please enter valid OTP" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const savePassword = async (req, res) => {
  try {
    if (req.body.password === req.body.cpassword) {
      await updateUserPassword(req.session.email, req.body.password);
      res.status(200).redirect("/Login");
    } else {
      res.render("resetPassword", { message: "Passwords do not match" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

// Product controllers

const productDetailedView = async (req, res) => {
  try {
    const userId = req.session.userData;
    const productId = req.query.id;
    
    const [{ findUser, cartCount, wishlistCount, userWishlist }, product] = await Promise.all([
      getCommonPageData(userId),
      getProductWithDetails(productId)
    ]);

    const [relatedProduct] = await Promise.all([
      getRelatedProducts(product.categoryId._id, productId)
    ]);

    const sizeOrder = product.sizes.sort((a, b) => a.size - b.size);

    res.render("productDetail", {
      products: product,
      findUser,
      relatedProduct,
      sizeOrder,
      cartCount,
      wishlistCount,
      userWishlist,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const productShop = async (req, res) => {
  try {
    const userId = req.session.userData;
    
    // Build filters
    let filter = { is_active: true };
    if (req.query.category) filter.categoryId = req.query.category;
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      filter.productName = { $regex: new RegExp(searchTerm, "i") };
    }

    // Build sort options
    let sortOptions = {};
    const sortMap = {
      "lowToHigh": { realPrice: 1 },
      "HighToLow": { realPrice: -1 },
      "nameSortAToZ": { productName: 1 },
      "nameSortZToA": { productName: -1 }
    };
    if (req.query.sort && sortMap[req.query.sort]) {
      sortOptions = sortMap[req.query.sort];
    }

    const page = parseInt(req.query.page) || 1;
    const perPage = 8;

    const [{ findUser, cartCount, wishlistCount, userWishlist }, category, productData] = await Promise.all([
      getCommonPageData(userId),
      Category.find(),
      searchAndFilterProducts(filter, sortOptions, page, perPage)
    ]);

    res.render("shopPage", {
      findUser,
      products: productData.products,
      category,
      currentPage: page,
      totalPages: productData.totalPages,
      query: req.query,
      cartCount,
      wishlistCount,
      wishlist: userWishlist,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const addReview = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { productId, comment, rating } = req.body;
    const errors = [];

    if (!rating) errors.push("Please select a rating star.");
    if (!comment || comment.trim() === "") errors.push("Please add a comment.");
    if (!productId) errors.push("Product ID is missing.");

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const findProduct = await Products.findById(productId);
    if (!findProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    findProduct.review.push({
      rating: parseInt(rating, 10),
      comment,
      userId,
    });

    await findProduct.save();
    return res.status(200).json({ message: "Thank you for your valuable feedback." });
  } catch (error) {
    console.error("Error submitting review:", error);
    return res.status(500).json({ message: "An error occurred. Please try again." });
  }
};

// User account controllers

const userDetails = async (req, res) => {
  try {
    const userId = req.session.userData;

    const [findUser, addresses, coupon, wallet] = await Promise.all([
      User.findById(userId),
      Address.find({ userId }),
      Coupon.find(),
      Wallet.findOne({ userId })
    ]);

    res.render("userAccount", {
      findUser,
      addresses,
      wallet,
      coupon
    });
  } catch (error) {
    console.error("Error in userDetails:", error);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};
const addUserAddress = async (req, res) => {
  try {
    const userId = req.session.userData;
    const errors = validateAddress(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ message: errors });
    }

    const address = new Address({
      userId: userId,
      ...req.body
    });

    await address.save();
    return res.status(200).json({ message: "Address added successfully" });
  } catch (error) {
    console.error("Error adding user address:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const editAddressPage = async (req, res) => {
  try {
    const addressId = req.query.id;
    const userId = req.session.userData;

    const [address, findUser] = await Promise.all([
      Address.findOne({ _id: addressId, userId }),
      User.findById(userId)
    ]);

    res.render("editAddress", { address, findUser });
  } catch (error) {
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const editAddress = async (req, res) => {
  try {
    const addressId = req.body.addressId;
    const userId = req.session.userData;

    await Address.findOneAndUpdate(
      { _id: addressId, userId },
      {
        name: req.body.name,
        mobile: req.body.mobile,
        homeAddress: req.body.homeAddress,
        city: req.body.city,
        district: req.body.district,
        state: req.body.state,
        pincode: req.body.pincode,
      }
    );

    res.redirect("/userInfo");
  } catch (error) {
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.userData;
    const addressId = req.body.addressId;

    await Address.findOneAndDelete({
      _id: addressId,
      userId: userId,
    });

    res.status(200).send("Address deleted successfully");
  } catch (error) {
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const orderInfos = async (req, res) => {
  try {
    const orderId = req.query.id;
    const userId = req.session.userData;

    const [findUser, addresses, orderedData] = await Promise.all([
      User.findById(userId),
      Address.find({ userId }),
      Order.findOne({ _id: orderId }).populate({
        path: "products.productId",
        populate: {
          path: "offerId",
          model: "Offer",
        },
      })
    ]);

    res.render("orderDetails", { findUser, addresses, orderedData });
  } catch (error) {
    console.error("Error order details shows :", error);
    res.status(500).render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

// Wallet controllers

const addWallet = async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ errors: ["Please enter a valid amount"] });
    }

    const order = await createRazorpayOrder(amount);
    res.json({ order });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const walletPaymentSuccess = async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    const userId = req.session.userData;

    await processWalletPayment(userId, paymentId, amount);
    res.json({ success: true });
  } catch (error) {
    console.log('Error in walletPaymentSuccess:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// Feedback controller

const addFeedback = async (req, res) => {
  try {
    const userId = req.session.userData;
    
    if (!userId) {
      return res.status(400).json({ message: "User is not logged in." });
    }

    const errors = validateFeedback(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0] });
    }

    const feedback = new Feedback({
      userId,
      name: req.body.name.trim(),
      email: req.body.email.trim(),
      subject: req.body.subject.trim(),
      comment: req.body.comment.trim(),
    });

    await feedback.save();
    res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error submitting feedback" });
  }
};

// Search controller

const searchProducts = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { findUser } = await getCommonPageData(userId);
    
    // This function can be expanded based on your search requirements
    const products = await Products.find();
    
    // Add your search logic here
    res.json({ products, findUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Search error" });
  }
};

module.exports = {
  // Page loading controllers
  loadHome,
  loadAbout,
  loadBlog,
  loadContact,
  render404,
  render500,
  
  // Auth controllers
  loadRegister,
  insertUser,
  otpGet,
  verifyOtp,
  loadLogin,
  verifyLogin,
  googleAuth,
  userLogOut,
  loadOrders,
  loadWallet,
  
  // Password reset controllers
  verifyEmail,
  resetPassword,
  resetPasswordOtp,
  verifyResetOtp,
  savePassword,
  
  // Product controllers
  productDetailedView,
  productShop,
  addReview,
  
  // User account controllers
  userDetails,
  addUserAddress,
  editAddressPage,
  editAddress,
  deleteAddress,
  orderInfos,
  
  // Wallet controllers
  addWallet,
  walletPaymentSuccess,
  
  // Feedback controller
  addFeedback,
  
  // Search controller
  searchProducts,
};