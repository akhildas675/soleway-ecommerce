const User = require("../../Model/userModel");
const Category = require("../../Model/categoryModel");
const Products = require("../../Model/productModel");
const Cart = require("../../Model/cartModel");
const bcrypt = require("bcrypt");
const Address = require("../../Model/addressModel");
const nodemailer = require("nodemailer");
const session = require("express-session");
const Order = require("../../Model/orderModel");
const Wishlist = require("../../Model/wishlistModel");
const { EnumCurrency } = require("paytm-pg-node-sdk");
const Razorpay = require("razorpay");
const Wallet = require("../../Model/walletModel");
const Coupon = require("../../Model/couponModel");
const Feedback=require("../../Model/feedback")

const loadHome = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const categories = await Category.find({ is_active: true });

    const products = await Products.find({ is_active: true })
      .populate('categoryId')
      .limit(8);

    const newArrivals = await Products.find({ is_active: true })
      .populate('categoryId')
      .sort({ createdAt: -1 })
      .limit(3);

    const activeProducts = products.filter(product => product.categoryId && product.categoryId.is_active);
    const activeNewArrivals = newArrivals.filter(product => product.categoryId && product.categoryId.is_active);

    const cart = await Cart.findOne({ userId }, { cartProducts: 1 });
    const cartCount = cart ? cart.cartProducts.length : 0;

    const wishlist = await Wishlist.findOne({ userId }, { wishlistProducts: 1 });
    const wishlistCount = wishlist ? wishlist.wishlistProducts.length : 0;

    let userWishlist = [];
    if (wishlist) {
      userWishlist = wishlist.wishlistProducts.map(p => p.productId.toString());
    }

    res.status(200).render("index", {
      findUser,
      categories,
      products: activeProducts,
      newArrival: activeNewArrivals,
      wishlist: userWishlist,
      cartCount,
      wishlistCount
    });
    
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};


const loadAbout = async(req,res)=>{
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const categories = await Category.find({ is_active: true });

    const products = await Products.find({ is_active: true })
      .populate('categoryId')
      .limit(8);

    const cart = await Cart.findOne({ userId }, { cartProducts: 1 });
    const cartCount = cart ? cart.cartProducts.length : 0;

    const wishlist = await Wishlist.findOne({ userId }, { wishlistProducts: 1 });
    const wishlistCount = wishlist ? wishlist.wishlistProducts.length : 0;

    let userWishlist = [];
    if (wishlist) {
      userWishlist = wishlist.wishlistProducts.map(p => p.productId.toString());
    }

    res.status(200).render("about", {
      findUser,
      categories,
      wishlist: userWishlist,
      cartCount,
      wishlistCount
    });
  } catch (error) {
    console.log(error)
  }
}

const loadBlog=async(req,res)=>{
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const categories = await Category.find({ is_active: true });

    const products = await Products.find({ is_active: true })
      .populate('categoryId')
      .limit(8);

    const cart = await Cart.findOne({ userId }, { cartProducts: 1 });
    const cartCount = cart ? cart.cartProducts.length : 0;

    const wishlist = await Wishlist.findOne({ userId }, { wishlistProducts: 1 });
    const wishlistCount = wishlist ? wishlist.wishlistProducts.length : 0;

    let userWishlist = [];
    if (wishlist) {
      userWishlist = wishlist.wishlistProducts.map(p => p.productId.toString());
    }

    const newArrivals = await Products.find({ is_active: true })
      .populate('categoryId')
      .sort({ createdAt: -1 })
      .limit(6);

    res.render('blog',{
      findUser,
      categories,
      wishlist: userWishlist,
      cartCount,
      wishlistCount,
      newArrivals,
      products
    })
  } catch (error) {
    console.log(error)
  }
}



const googleAuth = async (req, res) => {
  try {
    const googleUser = req.user;
    const email = googleUser.emails[0].value;

    const findUser = await User.findOne({ email });
    // console.log('finduser',findUser);

    if (!findUser) {
      res.redirect("/userRegister");
    }
    req.session.userData = findUser;
    // console.log('woohooo');

    res.redirect("/");
  } catch (error) {
    console.log("Error during the google Authentication", error.message);
  }
};

const loadRegister = async (req, res) => {
  try {
    res.status(200).render("userRegister");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const insertUser = async (req, res) => {
  try {
    const { name, email, password, cPassword, mobile } = req.body;
    let errors = [];

    if (!name) {
      errors.push("Name is required.");
    }
    if (!email) {
      errors.push("Email is required.");
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        errors.push("Please enter a valid email address.");
      }
    }
    if (!mobile) {
      errors.push("Mobile number is required.");
    } else {
      const mobilePattern = /^[0-9]{10}$/;
      if (!mobilePattern.test(mobile)) {
        errors.push("Please enter a valid mobile number.");
      }
    }
    if (!password) {
      errors.push("Password is required.");
    } else if (password.length < 8 || password.length > 12) {
      errors.push("Password must be between 8 and 12 characters long.");
    } else if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter.");
    } else if (!/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number.");
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character.");
    }
    
    if (!cPassword) {
      errors.push("Confirm password is required.");
    } else if (password && password !== cPassword) {
      errors.push("Passwords do not match.");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        errors: ["An account with this email already exists. Please login."],
      });
    }

    req.session.data = { name, email, mobile, password };

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
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSKEY,
      },
    });

    // Generate random OTP
    let randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Generated OTP: ", randomOtp);
    req.session.otp = randomOtp;

    const { email, name } = req.session.data;
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: `Hello ${name}`,
      text: `Your verification OTP is ${randomOtp}`,
    };

    // Send the OTP via email
    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);

    // Render OTP input page with an empty message initially
    res.status(200).render("userOtp", { message: "" });
  } catch (error) {
    console.error("Error sending email: ", error);
    res.status(500).send("Error sending email");
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (req.session.otp === otp) {
      const { name, email, mobile, password } = req.session.data;

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({ name, email, mobile, password: hashedPassword });
      const userData = await user.save();

      if (userData) {
        req.session.user = userData._id;

        delete req.session.otp;

        res.status(200).render("userLogin");
      } else {
        res.render("userOtp", {
          message:
            "There was an issue registering your account. Please try again.",
        });
      }
    } else {
      res.render("userOtp", { message: "Invalid OTP, please try again." });
    }
  } catch (error) {
    console.error("Error verifying OTP: ", error);
    res
      .status(500)
      .render("userOtp", { message: "Server Error. Please try again." });
  }
};

const loadLogin = async (req, res) => {
  try {
    res.status(200).render("userLogin");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    let errors = [];
    if (!email) {
      errors.push("Email is required.");
    }
    if (!password) {
      errors.push("Password is required.");
    }

   
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const userData = await User.findOne({ email: email });
    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_active) {
          req.session.userData = userData._id;
          res.status(200).json({ message: "Login successful" });
        } else {
          res.status(403).json({ message: "Your account is blocked" });
        }
      } else {
        res.status(400).json({ message: "Incorrect email or password" });
      }
    } else {
      res.status(404).json({ message: "You have no account, please register" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An internal server error occurred" });
  }
};

const userLogOut = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err.message);
        return res.status(500).send("Unable to log out");
      }
      res.status(200).redirect("/");
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const verifyEmail = async (req, res) => {
  try {
    res.status(200).render("emailVerify");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
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
    res.status(500).send("Server Error");
  }
};

const resetPasswordOtp = async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSKEY,
      },
    });

    const userData = await User.findOne({ email: req.session.email });

    let randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    req.session.resetPOtp = randomOtp;
    console.log(randomOtp, "forget password otp");

    const resetPasswordOptions = {
      from: process.env.EMAIL,
      to: req.session.email,
      subject: `Hello ${userData.name}`,
      text: `Your forgot password verifying OTP is ${randomOtp}`,
    };

    try {
      let info = await transporter.sendMail(resetPasswordOptions);
      // console.log("Email sent: " + info.response);
      res.status(200).render("passwordOtp");
    } catch (error) {
      // console.log("Error sending email: " + error);
      res.status(500).send("Error sending email");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    let resetOtp = req.body.otp;
    if (req.session.resetPOtp === resetOtp) {
      res.status(200).render("resetPassword");
    } else {
      res.render("passwordOtp", { message: "Please enter valid OTP" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const savePassword = async (req, res) => {
  try {
    if (req.body.password === req.body.cpassword) {
      let newPassword = req.body.password;
      let userData = await User.findOne({ email: req.session.email });
      hashedPassword = await bcrypt.hash(newPassword, 10);

      userData.password = hashedPassword;
      await userData.save();
      res.status(200).redirect("/Login");
    } else {
      res.render("resetPassword", { message: "Passwords do not match" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const productDetailedView = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);

    const productId = req.query.id;

    const products = await Products.findOne({ _id: productId })
      .populate("categoryId")
      .populate("offerId")
      .populate({
        path: "review.userId",
        select: "name",
      });

    const sizeOrder = products.sizes.sort((a, b) => a.size - b.size);

    const relatedProduct = await Products.find({
      categoryId: products.categoryId._id,
      _id: { $ne: productId },
    }).limit(4);

    const cart = await Cart.findOne({ userId }, { cartProducts: 1 });
    const cartCount = cart ? cart.cartProducts.length : 0;

    const wishlist = await Wishlist.findOne({ userId }, { wishlistProducts: 1 });
    const wishlistCount = wishlist ? wishlist.wishlistProducts.length : 0;

    let userWishlist = [];
    if (wishlist) {
      userWishlist = wishlist.wishlistProducts.map(p => p.productId.toString());
    }


    res.render("productDetail", {
      products,
      findUser,
      relatedProduct,
      sizeOrder,
      cartCount,
      wishlistCount,
      userWishlist,

    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const productShop = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const category = await Category.find(); 

    let filter = { is_active: true };

    // Category filter
    if (req.query.category) {
      filter.categoryId = req.query.category;
    }

    // Search filter
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      filter.productName = { $regex: new RegExp(searchTerm, "i") };
    }

    // Sort options
    let sortOptions = {};
    if (req.query.sort === "lowToHigh") {
      sortOptions.realPrice = 1;
    } else if (req.query.sort === "HighToLow") {
      sortOptions.realPrice = -1;
    } else if (req.query.sort === "nameSortAToZ") {
      sortOptions.productName = 1;
    } else if (req.query.sort === "nameSortZToA") {
      sortOptions.productName = -1;
    }

    // Pagination
    const perPage = 8;
    const page = parseInt(req.query.page) || 1;

    // Total count 
    const totalProducts = await Products.countDocuments(filter).populate("categoryId");

    // Fetch products with active categories
    const products = await Products.find(filter)
      .populate("categoryId")
      .sort(sortOptions)
      .skip((page - 1) * perPage)
      .limit(perPage);

    // products based on category being active
    const activeProducts = products.filter(product => product.categoryId && product.categoryId.is_active);

    // Cart and wishlist count
    const cart = await Cart.findOne({ userId: userId }, { cartProducts: 1 });
    const cartCount = cart ? cart.cartProducts.length : 0;

    const wishlist = await Wishlist.findOne({ userId: userId }, { wishlistProducts: 1 });
    const wishlistCount = wishlist ? wishlist.wishlistProducts.length : 0;
    let userWishlist = [];
    if (wishlist) {
      userWishlist = wishlist.wishlistProducts.map(p => p.productId.toString());
    }

    res.render("shopPage", {
      findUser,
      products: activeProducts,
      category,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / perPage),
      query: req.query,
      cartCount,
      wishlistCount,
      wishlist:userWishlist,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  }
};


const addReview = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { productId, comment, rating } = req.body;
    const errors = [];

    if (!rating) {
      errors.push("Please select a rating star.");
    }
    if (!comment || comment.trim() === "") {
      errors.push("Please add a comment.");
    }
    if (!productId) {
      errors.push("Product ID is missing.");
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(" ") });
    }

    const findProduct = await Products.findById(productId);
    if (!findProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    const newReview = {
      rating: parseInt(rating, 10), 
      comment,
      userId,
    };

    findProduct.review.push(newReview);
    await findProduct.save();

    return res
      .status(200)
      .json({ message: "Thank you for your valuable feedback." });
  } catch (error) {
    console.error("Error submitting review:", error);
    return res
      .status(500)
      .json({ message: "An error occurred. Please try again." });
  }
};

const userDetails = async (req, res) => {
  try {
    const userId = req.session.userData;

    // Order Pagination
    const orderPage = parseInt(req.query.page) || 1;
    const orderLimit = 6;
    const orderSkip = (orderPage - 1) * orderLimit;

    // Wallet Pagination
    const walletPage = parseInt(req.query.walletPage) || 1;
    const walletLimit = 8;
    const walletSkip = (walletPage - 1) * walletLimit;

    // Fetch User Details
    const findUser = await User.findById(userId);
    const addresses = await Address.find({ userId: userId });

   
    const orderedData = await Order.find({ userId: userId })
      .populate("products.productId")
      .sort({ orderDate: -1 })
      .skip(orderSkip)
      .limit(orderLimit);

    const totalOrders = await Order.countDocuments({ userId: userId });
    const totalOrderPages = Math.ceil(totalOrders / orderLimit);

  
    const wallet = await Wallet.findOne({ userId: userId });
    let walletHistory = [];
    let totalWalletPages = 0;

    if (wallet) {
      // Sort 
      wallet.history.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
      walletHistory = wallet.history.slice(walletSkip, walletSkip + walletLimit);
      totalWalletPages = Math.ceil(wallet.history.length / walletLimit);
    }

    const coupon = await Coupon.find();

    
    res.render("userAccount", {
      findUser,
      addresses,
      orderedData,
      wallet: { ...wallet.toObject(), history: walletHistory },
      coupon,
      currentPage: orderPage,
      totalOrderPages: totalOrderPages,
      currentWalletPage: walletPage,
      totalWalletPages: totalWalletPages,
    });
  } catch (error) {
    console.error("Error in userDetails:", error);
  }
};


const addUserAddress = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { name, mobile, homeAddress, city, district, state, pincode } = req.body;

    // console.log("Add userAddress data from body", req.body);

    let errors = [];

    if (!name) errors.push("Name is required");

    const mobilePattern = /^[0-9]{10}$/;
    if (!mobile) {
      errors.push("Mobile number is required");
    } else if (!mobilePattern.test(mobile)) {
      errors.push("Please enter a valid 10-digit mobile number");
    }

    if (!homeAddress) errors.push("Home address is required");

    if (!city) errors.push("City is required");

    if (!district) errors.push("District is required");

    if (!state) errors.push("State is required");

    const pincodePattern = /^[0-9]{6}$/;
    if (!pincode) {
      errors.push("Pincode is required");
    } else if (!pincodePattern.test(pincode)) {
      errors.push("Pincode must be a 6-digit number");
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: errors });
    }

    const address = new Address({
      userId: userId,
      name,
      mobile,
      homeAddress,
      city,
      district,
      state,
      pincode,
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

    // console.log("Edit Address Page - Address ID:", addressId);
    // console.log("Edit Address Page - User ID:", userId);

    const address = await Address.findOne({ _id: addressId, userId: userId });
    const findUser = await User.findById(userId);

    // console.log("Address from edit",address)
    // console.log("Find user from edit",findUser)

    res.render("editAddress", { address, findUser });
  } catch (error) {
    // console.log("Error in editAddressPage:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const editAddress = async (req, res) => {
  try {
    const addressId = req.body.addressId;
    const userId = req.session.userData;

    // console.log("Edit Address - Address ID form edit address page", addressId);
    // console.log("Edit Address - User ID  from edit address page", userId);

    const updatedAddress = await Address.findOneAndUpdate(
      { _id: addressId, userId: userId },
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
    // console.log("Error in editAddress:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.userData;
    const addressId = req.body.addressId;

    // console.log("Delete Address - User ID:", userId);
    // console.log("Delete Address - Address ID:", addressId);

    const address = await Address.findOneAndDelete({
      _id: addressId,
      userId: userId,
    });

    res.status(200).send("Address deleted successfully");
  } catch (error) {
    // console.log("Error in deleteAddress:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const orderInfos = async (req, res) => {
  try {
    const orderId = req.query.id;
    const userId = req.session.userData;

    const findUser = await User.findById(userId);
    const addresses = await Address.find({ userId: userId });

    const orderedData = await Order.findOne({
      _id: orderId,
    }).populate({
      path: "products.productId",
      populate: {
        path: "offerId", 
        model: "Offer",
      },
    });

    // console.log("Ordered Data Products:", orderedData);

    orderedData.products.forEach((product) => {
      if (product.productId && typeof product.productId === "object") {
        // console.log("Product Name:", product.productId.productName);
      } else {
        // console.log("Product ID not populated:", product.productId);
      }
    });

    res.render("orderDetails", { findUser, addresses, orderedData });
  } catch (error) {
    console.error("Error order details shows :", error);
    res.send("Internal Server Error");
  }
};

const searchProducts = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const product = await Products.find();
  } catch (error) {
    console.log(error);
  }
};

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

// Razorpay instance
const instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

const addWallet = async (req, res) => {
  try {
    let amount = parseFloat(req.body.amount);
    let errors = [];

    if (!amount || isNaN(amount) || amount <= 0) {
      errors.push("Please enter a valid amount");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const userId = req.session.userData;

    // Create a Razorpay order
    const order = await instance.orders.create({
      amount: amount * 100, 
      currency: "INR",
    });

    
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

    
    const payment = await instance.payments.fetch(paymentId);

    // Check if payment is captured successfully
    if (payment.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'Payment not captured' });
    }

    
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      //no wallet , create new one
      wallet = new Wallet({
        userId,
        balance: amount, 
        history: [{ amount, status: 'Credit', transactionDate: new Date() }],
      });
    } else {
      // Update existing wallet
      wallet.balance += amount; 
      wallet.history.push({
        amount,
        status: 'Credit',
        transactionDate: new Date(),
      });
    }

    // Save 
    await wallet.save();

    res.json({ success: true });
  } catch (error) {
    console.log('Error in walletPaymentSuccess:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

const loadContact=async (req,res)=>{
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const categories = await Category.find({ is_active: true });

    const products = await Products.find({ is_active: true })
      .populate('categoryId')
      .limit(8);

    const cart = await Cart.findOne({ userId }, { cartProducts: 1 });
    const cartCount = cart ? cart.cartProducts.length : 0;

    const wishlist = await Wishlist.findOne({ userId }, { wishlistProducts: 1 });
    const wishlistCount = wishlist ? wishlist.wishlistProducts.length : 0;

    let userWishlist = [];
    if (wishlist) {
      userWishlist = wishlist.wishlistProducts.map(p => p.productId.toString());
    }
    res.render('contact',{
      findUser,
      categories,
      wishlist: userWishlist,
      cartCount,
      wishlistCount,
      
    })
  } catch (error) {
    console.log(error)
  }
}

const addFeedback = async (req, res) => {
  try {
      const { name, email, subject, comment } = req.body;
      const userId = req.session.userData;

    
      if (!userId) return res.status(400).json({ message: "User is not logged in." });
      if (!name.trim()) return res.status(400).json({ message: "Name is required." });
      if (!subject.trim()) return res.status(400).json({ message: "Subject is required." });
      if (!comment.trim()) return res.status(400).json({ message: "Message is required." });

      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.trim()) return res.status(400).json({ message: "Email is required." });
      if (!emailRegex.test(email)) {
          return res.status(400).json({ message: "Please enter a valid email address." });
      }

      // Create new feedback document
      const feedback = new Feedback({
          userId,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          comment: comment.trim(),
      });

      await feedback.save();
      res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error submitting feedback" });
  }
};





module.exports = {
  loadHome,
  loadAbout,
  loadBlog,
  loadRegister,
  insertUser,
  loadLogin,
  verifyLogin,
  otpGet,
  verifyOtp,
  userLogOut,
  verifyEmail,
  resetPassword,
  resetPasswordOtp,
  verifyResetOtp,
  savePassword,
  addUserAddress,
  editAddressPage,
  editAddress,
  productDetailedView,
  productShop,
  userDetails,
  orderInfos,
  googleAuth,
  searchProducts,
  deleteAddress,
  addWallet,
  walletPaymentSuccess,
  addReview,
  loadContact,
  addFeedback,
};
