const express = require("express");
const userRoute = express();
const path = require("path");
const passport = require("passport");
require("../passport");
const Auth = require("../middleware/userAuth");

// Controllers
const userController = require("../Controller/userController/userController");
const userAuthController = require("../Controller/userController/userAuthController");
const orderController = require("../Controller/userController/orderController");
const cartController = require("../Controller/userController/cartController");

userRoute.use(express.static("public"));
userRoute.use(
  express.static(path.join(__dirname, "..", "public", "user-assets"))
);
userRoute.set("view engine", "ejs");
userRoute.set("views", "./views/user");

// Passport initialization
userRoute.use(passport.initialize());
userRoute.use(passport.session());

// Home page
userRoute.get("/", userController.loadHome);

// Registration
userRoute.get("/Register", Auth.isLogOut, userAuthController.loadRegister);
userRoute.post("/verifyRegister", Auth.isLogOut, userAuthController.insertUser);
userRoute.get("/otpGet", Auth.isLogOut, userAuthController.otpGet);
userRoute.post("/verifyOtp", Auth.isLogOut, userAuthController.verifyOtp);

// Login
userRoute.get("/Login", Auth.isLogOut, userAuthController.loadLogin);
userRoute.post("/verifylog", Auth.isLogOut, userAuthController.verifyLogin);
userRoute.get("/logOut", userAuthController.userLogOut);

// Google Authentication
userRoute.get(
  "/login/google",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

userRoute.get(
  "/auth/google/callback",  // ✓ This matches
  passport.authenticate("google", { failureRedirect: "/Login" }),
  userAuthController.googleAuth
);

// Password Reset
userRoute.get("/emailVerify", Auth.isLogOut, userAuthController.verifyEmail);
userRoute.post("/existUser", Auth.isLogOut, userAuthController.resetPassword);
userRoute.get(
  "/userNewOtp",
  Auth.isLogOut,
  userAuthController.resetPasswordOtp
);
userRoute.post("/resetOtp", Auth.isLogOut, userAuthController.verifyResetOtp);
userRoute.post("/postPassword", Auth.isLogOut, userAuthController.savePassword);

/* Protected Routes*/

// Static Pages
userRoute.get("/About", Auth.isLogin, userController.loadAbout);
userRoute.get("/Blog", Auth.isLogin, userController.loadBlog);
userRoute.get("/Contact", Auth.isLogin, userController.loadContact);

// Product Routes
userRoute.get(
  "/productView",
  Auth.isLogin,
  Auth.userBlocked,
  userController.productDetailedView
);
userRoute.get("/Shop", Auth.isLogin, userController.productShop);
userRoute.post("/submitReview", Auth.isLogin, userController.addReview);
userRoute.get("/searchProducts", Auth.isLogin, userController.searchProducts);

// Wishlist Routes
userRoute.get("/Wishlist", Auth.isLogin, cartController.loadWishlist);
userRoute.post("/toggleWishlist", Auth.isLogin, cartController.addToWishlist);

// Cart Routes
userRoute.get("/Cart", Auth.isLogin, cartController.loadCart);
userRoute.post("/addToCart", Auth.isLogin, cartController.addToCart);
userRoute.post("/updateCart", Auth.isLogin, cartController.updateCart);
userRoute.post(
  "/deleteCartItem",
  Auth.isLogin,
  cartController.deleteItemInCart
);

// Order Routes
userRoute.get("/Checkout", Auth.isLogin, orderController.loadCheckout);
userRoute.post("/codOrder", Auth.isLogin, orderController.codPlaceOrder);
userRoute.post("/onlinePay", Auth.isLogin, orderController.onlinePay);
userRoute.post("/walletOrder", Auth.isLogin, orderController.walletPay);
userRoute.post(
  "/updateOrderStatus",
  Auth.isLogin,
  orderController.updateOrderStatus
);
userRoute.post("/applyCoupon", Auth.isLogin, orderController.applyCoupon);
userRoute.post("/removeCoupon", Auth.isLogin, orderController.removeCoupon);
userRoute.get("/orderSuccess", Auth.isLogin, orderController.successOrder);
userRoute.post("/orderCancel", Auth.isLogin, orderController.cancellation);
userRoute.post("/returnOrder", Auth.isLogin, orderController.returnOrder);
userRoute.post("/rePay", Auth.isLogin, orderController.rePayment);
userRoute.get(
  "/order/invoice/download/:orderId",
  Auth.isLogin,
  orderController.getInvoice
);

// User Account Management Routes
userRoute.get("/Account", Auth.isLogin, userController.userDetails);
userRoute.get("/orders", Auth.isLogin, userController.loadOrders);
userRoute.get("/orderDetails", Auth.isLogin, userController.orderInfos);

// Wallet Routes
userRoute.get("/wallet", Auth.isLogin, userController.loadWallet);
userRoute.post("/addToWallet", Auth.isLogin, userController.addWallet);
userRoute.post(
  "/walletPaymentSuccess",
  Auth.isLogin,
  userController.walletPaymentSuccess
);

// Coupon Routes
userRoute.get("/coupons", Auth.isLogin, userController.loadCoupons);

// Address Management Routes
userRoute.get("/addresses", Auth.isLogin, userController.loadAddresses);
userRoute.get("/add-address", Auth.isLogin, userController.loadAddAddress);
userRoute.post("/addaddress", Auth.isLogin, userController.addUserAddress);
userRoute.get("/addressEditView", Auth.isLogin, userController.editAddressPage);
userRoute.post("/editAddress", Auth.isLogin, userController.editAddress);
userRoute.post("/deleteAddress", Auth.isLogin, userController.deleteAddress);

// Feedback Route
userRoute.post("/feedback", Auth.isLogin, userController.addFeedback);

//Error page
userRoute.get("/404", userController.render404);
userRoute.get("/500", userController.render500);

// Catch-all 404 handler
userRoute.use((req, res) => {
  res.status(404).redirect("/404");
});

module.exports = userRoute;
