const express = require("express");
const userRoute = express();
const path = require("path");
const bodyParser = require("body-parser");
const passport = require("passport");
require("../passport");

const userController = require("../Controller/userController/userController");
const Auth = require("../middleware/userAuth");

const orderController = require("../Controller/userController/orderController");
const cartController = require("../Controller/userController/cartController");
const { addCoupon } = require("../Controller/admin/adminController");
const { invoice } = require("paypal-rest-sdk");

userRoute.use(express.static("public"));
userRoute.use(
  express.static(path.join(__dirname, "..", "public", "user-assets"))
);
userRoute.set("view engine", "ejs");
userRoute.set("views", "./views/user");

userRoute.use(passport.initialize());
userRoute.use(passport.session());

//User Home page
userRoute.get("/", userController.loadHome);

userRoute.get("/logOut", userController.userLogOut);

//User registration
userRoute.get("/Register", Auth.isLogOut, userController.loadRegister);
userRoute.post("/verifyRegister", Auth.isLogOut, userController.insertUser);

//google Auth
userRoute.get(
  "/login/google",
  passport.authenticate("google", { scope: ["email", "profile"] }),
  userController.googleAuth
);
userRoute.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  userController.googleAuth
);

userRoute.get("/Login", Auth.isLogOut, userController.loadLogin);
userRoute.post("/verifylog", Auth.isLogOut, userController.verifyLogin);
userRoute.get("/otpGet", Auth.isLogOut, userController.otpGet);
userRoute.post("/verifyOtp", Auth.isLogOut, userController.verifyOtp);

//forgetPassword
userRoute.get("/emailVerify", Auth.isLogOut, userController.verifyEmail);
userRoute.post("/existUser", Auth.isLogOut, userController.resetPassword);
userRoute.get("/userNewOtp", Auth.isLogOut, userController.resetPasswordOtp);
userRoute.post("/resetOtp", Auth.isLogOut, userController.verifyResetOtp);
userRoute.post("/postPassword", Auth.isLogOut, userController.savePassword);

//user inside routes
userRoute.get(
  "/productView",
  Auth.isLogin,
  Auth.userBlocked,
  userController.productDetailedView
);
userRoute.get("/About",Auth.isLogin,userController.loadAbout);
userRoute.get('/Blog',Auth.isLogin,userController.loadBlog)
// userRoute.get('/productView',Auth.isLogin,userController.productDetailedView)

// shop paRoutes
userRoute.get("/Shop", Auth.isLogin, userController.productShop);
userRoute.post("/submitReview", Auth.isLogin, userController.addReview);

//Whislist Routes

userRoute.get("/Wishlist", Auth.isLogin, cartController.loadWishlist);
userRoute.post("/toggleWishlist", Auth.isLogin, cartController.addToWishlist);

//cart to Order
userRoute.get("/Cart", Auth.isLogin, cartController.loadCart);
userRoute.post("/addToCart", Auth.isLogin, cartController.addToCart);
userRoute.post("/updateCart", Auth.isLogin, cartController.updateCart);
userRoute.post(
  "/deleteCartItem",
  Auth.isLogin,
  cartController.deleteItemInCart
);

// Order procedures
userRoute.get("/Checkout", Auth.isLogin, orderController.loadCheckout);
userRoute.post("/codOrder", Auth.isLogin, orderController.codPlaceOrder);
userRoute.post("/onlinePay", Auth.isLogin, orderController.onlinepay);
userRoute.post("/walletOrder", Auth.isLogin, orderController.walletPay);
userRoute.post(
  "/updateOrderStatus",
  Auth.isLogin,
  orderController.updateOrderStatus
);
userRoute.post("/applyCoupon", Auth.isLogin, orderController.applyCoupon);
userRoute.post("/removeCoupon", Auth.isLogin, orderController.removeCoupon);

userRoute.get("/orderSuccess", Auth.isLogin, orderController.successOrder);
userRoute.post("/orderCancel", Auth.isLogin, orderController.cancelation);
userRoute.post("/returnOrder", Auth.isLogin, orderController.returnOrder);
userRoute.post("/rePay",Auth.isLogin,orderController.rePayment)
userRoute.get(
  "/order/invoice/download/:orderId",
  Auth.isLogin,
  orderController.getInvoice
);

//User management
userRoute.get("/Account", Auth.isLogin, userController.userDetails);
userRoute.post("/Addaddress", Auth.isLogin, userController.addUserAddress);
userRoute.get("/addressEditView", Auth.isLogin, userController.editAddressPage);
userRoute.post("/editAddress", Auth.isLogin, userController.editAddress);
userRoute.post("/deleteAddress", Auth.isLogin, userController.deleteAddress);
userRoute.get("/orderDetails", Auth.isLogin, userController.orderInfos);

//Wallet

userRoute.post("/addToWallet", Auth.isLogin, userController.addWallet);
userRoute.post(
  "/walletPaymentSuccess",
  Auth.isLogin,
  userController.walletPaymentSuccess
);

//Search products

userRoute.get("/searchProducts", Auth.isLogin, userController.searchProducts);

//test

module.exports = userRoute;
