//module require

const express = require("express");
const adminRoute = express();
const adminController = require("../Controller/admin/adminController");
const path = require("path");
const Auth = require("../middleware/adminAuth");
const categoryController = require("../Controller/admin/categoryController");
const productController = require("../Controller/admin/productController");

const multerImage = require("../config/multer");
const multer = require("multer");

//-----------------------------------

adminRoute.use(express.static("public"));
adminRoute.use(
  express.static(path.join(__dirname, "..", "public", "admin-assets"))
);

adminRoute.set("view engine", "ejs");
adminRoute.set("views", "./views/admin");
adminRoute.use(
  "/uploads",
  express.static(path.join(__dirname, "public/uploads"))
);

adminRoute.get("/signIn", Auth.isLogout, adminController.adminLogin);
adminRoute.post("/loginAdmin", Auth.isLogout, adminController.verifyAdminLogin);
adminRoute.get("/salesReport", Auth.isLogin, adminController.salesReport);

//Admin controller

adminRoute.get("/Home", Auth.isLogin, adminController.adminLoad);
adminRoute.get("/adminLogout", Auth.isLogin, adminController.adminLogout);

//user Management

adminRoute.get("/usersView", Auth.isLogin, adminController.loadUsers);
adminRoute.get("/blockUser", Auth.isLogin, adminController.userBlocking);
adminRoute.get("/unBlockUser", Auth.isLogin, adminController.userUnblocking);

//Category Controller

adminRoute.get("/categoryAdd", Auth.isLogin, categoryController.categoryPage);
adminRoute.post(
  "/addingCategory",
  Auth.isLogin,
  categoryController.categoryAdding
);
adminRoute.get(
  "/categoryBlock",
  Auth.isLogin,
  categoryController.categoryBlocking
);
adminRoute.get(
  "/categoryUnblock",
  Auth.isLogin,
  categoryController.categoryUnblocking
);
adminRoute.get("/categoryEdit", Auth.isLogin, categoryController.editCategory);
adminRoute.post(
  "/editCategory",
  Auth.isLogin,
  categoryController.editingCategory
);

//productController

adminRoute.get("/productsView", Auth.isLogin, productController.productPage);
adminRoute.get("/productAdd", Auth.isLogin, productController.addProduct);
adminRoute.post(
  "/createProduct",
  Auth.isLogin,
  multerImage.upload.array("images", 5),
  productController.productVerify
);
adminRoute.get(
  "/editProducts",
  Auth.isLogin,
  productController.editProductPage
);
adminRoute.get(
  "/productBlock",
  Auth.isLogin,
  productController.productBlocking
);
adminRoute.get(
  "/productUnblock",
  Auth.isLogin,
  productController.productUnblocking
);
adminRoute.delete(
  "/deleteProduct/:id",
  Auth.isLogin,
  productController.deleteProduct
);
adminRoute.post(
  "/updateProduct",
  Auth.isLogin,
  multerImage.upload.array("images", 5),
  productController.updateProduct
);
adminRoute.post(
  "/removeImage",
  Auth.isLogin,
  productController.removeImageEditproduct
);

//order management

adminRoute.get("/orderMng", Auth.isLogin, adminController.adminOrderMng);
adminRoute.get("/orderInfo", Auth.isLogin, adminController.orderDetailsOfUser);
adminRoute.post(
  "/updateOrderStatus",
  Auth.isLogin,
  adminController.updateOrderStatus
);

//coupon management

adminRoute.get("/loadCoupon", Auth.isLogin, adminController.loadCouponPage);
adminRoute.post("/addCoupon", Auth.isLogin, adminController.addCoupon);
adminRoute.get("/couponEdit", Auth.isLogin, adminController.loadEditCoupon);
adminRoute.post("/editCoupon", Auth.isLogin, adminController.editCoupon);
adminRoute.get("/couponBlock", Auth.isLogin, adminController.blockCoupon);
adminRoute.get("/couponUnblock", Auth.isLogin, adminController.unblockCoupon);
adminRoute.post("/couponDelete", Auth.isLogin, adminController.deleteCoupon);

//offer
adminRoute.get("/loadOffer", Auth.isLogin, productController.loadOffer);
adminRoute.post("/addOffer", Auth.isLogin, productController.addOffer);
adminRoute.get("/editOffer", Auth.isLogin, productController.loadEditOffer);
adminRoute.post("/updateOffer", Auth.isLogin, productController.updateOffer);
// adminRoute.get('/blockOffer',Auth.isLogin,productController.blockOffer)
// adminRoute.get('/unblockOffer',Auth.isLogin,productController.unblockOffer)
adminRoute.delete("/deleteOffer", Auth.isLogin, productController.deleteOffer);

// adminRoute.get('/find',productController.findThePage)

module.exports = adminRoute;
