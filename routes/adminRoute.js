//module require

const express = require("express");
const adminRoute = express();
const adminController = require("../Controller/adminController/adminController");
const path = require("path");
const Auth = require("../middleware/adminAuth");
const categoryController = require("../Controller/adminController/categoryController");
const productController = require("../Controller/adminController/productController");

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
//To get login page
adminRoute.get("/signIn", Auth.isLogout, adminController.adminLogin);

adminRoute.post("/loginAdmin", Auth.isLogout, adminController.verifyAdminLogin);
adminRoute.get("/salesReport", Auth.isLogin, adminController.salesReport);

//Admin controller

adminRoute.get("/Home", Auth.isLogin, adminController.adminLoad);
adminRoute.get("/adminLogout", Auth.isLogin, adminController.adminLogout);

//user Management

adminRoute.get("/usersView", Auth.isLogin, adminController.loadUsers);

adminRoute.post("/blockUser", Auth.isLogin, adminController.userBlocking);
adminRoute.post("/unBlockUser", Auth.isLogin, adminController.userUnblocking);

//Category Controller

adminRoute.get("/categoryAdd", Auth.isLogin, categoryController.categoryPage);
adminRoute.post("/category", Auth.isLogin, categoryController.categoryAdding);
adminRoute.put(
  "/category/:id",
  Auth.isLogin,
  categoryController.editingCategory
);
adminRoute.patch(
  "/category/:id",
  Auth.isLogin,
  categoryController.toggleCategory
);
adminRoute.delete(
  "/category/:id",
  Auth.isLogin,
  categoryController.deleteCategory
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
  productController.removeImageEditProduct
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
adminRoute.post("/editCoupon", Auth.isLogin, adminController.editCoupon);
adminRoute.get("/blockCoupon", Auth.isLogin, adminController.blockCoupon);
adminRoute.get("/unblockCoupon", Auth.isLogin, adminController.unblockCoupon);
adminRoute.post("/couponDelete", Auth.isLogin, adminController.deleteCoupon);
//offer
adminRoute.get("/loadOffer", Auth.isLogin, productController.loadOffer);
adminRoute.post("/addOffer", Auth.isLogin, productController.addOffer);
adminRoute.post("/updateOffer", Auth.isLogin, productController.updateOffer);
adminRoute.delete("/deleteOffer", Auth.isLogin, productController.deleteOffer);

// adminRoute.get('/find',productController.findThePage)

module.exports = adminRoute;
