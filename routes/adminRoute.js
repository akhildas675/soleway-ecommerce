//module require

const express=require('express');
const adminRoute = express()
const adminController=require('../Controller/admin/adminController')
const path=require('path')
const Auth=require('../middleware/adminAuth')
const categoryController=require('../Controller/admin/categoryController')
const productController=require('../Controller/admin/productController')

const multerImage=require('../config/multer')
const multer=require('multer')

//-----------------------------------

adminRoute.use(express.static('public'))
adminRoute.use(express.static(path.join(__dirname, '..', 'public', 'admin-assets')))

adminRoute.set('view engine','ejs')
adminRoute.set('views','./views/admin')
adminRoute.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

adminRoute.get('/signIn',Auth.isLogout,adminController.adminLogin)
adminRoute.post('/loginAdmin',Auth.isLogout,adminController.verifyAdminLogin)


//Admin controller

adminRoute.get('/adminHome',Auth.isLogin,adminController.adminLoad)
adminRoute.get('/adminLogout',Auth.isLogin,adminController.adminLogout)

//user Management

adminRoute.get('/usersView',Auth.isLogin,adminController.loadUsers)
adminRoute.get('/blockUser',Auth.isLogin,adminController.userBlocking)
adminRoute.get('/unBlockUser',Auth.isLogin,adminController.userUnblocking)

//Category Controller

adminRoute.get('/categoryAdd',Auth.isLogin,categoryController.categoryPage)
adminRoute.post('/addingCategory',Auth.isLogin,categoryController.categoryAdding)
adminRoute.get('/categoryBlock',Auth.isLogin,categoryController.categoryBlocking)
adminRoute.get('/categoryUnblock',Auth.isLogin,categoryController.categoryUnblocking)
adminRoute.get('/categoryEdit',Auth.isLogin,categoryController.editCategory)
adminRoute.post('/editCategory',Auth.isLogin,categoryController.editingCategory)

//productController

adminRoute.get('/productsView',Auth.isLogin,productController.productPage)
adminRoute.get('/productAdd',Auth.isLogin,productController.addProduct)
adminRoute.post('/createProduct', Auth.isLogin, multerImage.upload.array('images', 3), productController.productVerify);
adminRoute.get('/editProducts',Auth.isLogin,productController.editProductPage)
adminRoute.get('/productBlock',Auth.isLogin,productController.productBlocking)
adminRoute.get('/productUnblock',Auth.isLogin,productController.productUnblocking)
adminRoute.post('/updateProduct',Auth.isLogin,multerImage.upload.array('images', 3), productController.updateProduct)
adminRoute.post('/removeImage',Auth.isLogin,productController.removeImageEditproduct)

//order management

adminRoute.get('/orderMng',Auth.isLogin,adminController.adminOrderMng)
adminRoute.get('/orderInfo',Auth.isLogin,adminController.orderDetailsOfUser)
















adminRoute.get('/thor',adminController.loki)












// adminRoute.get('/find',productController.findThePage)





module.exports=adminRoute;