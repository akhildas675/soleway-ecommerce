
const express = require('express');
const userRoute = express();
const path = require('path');
const bodyParser=require('body-parser')
const passport=require('passport')
require('../passport');



const userController=require('../Controller/userController/userController')
const Auth=require('../middleware/userAuth')

const orderController=require('../Controller/userController/orderController')
const cartController = require('../Controller/userController/cartController')


// Define your routes here
// userRoute.use()



userRoute.use(express.static('public'))
userRoute.use(express.static(path.join(__dirname, '..', 'public', 'user-assets'))); // Note the use of '..' to go up a directory level
userRoute.set('view engine','ejs');
userRoute.set('views','./views/user')
//userRoute.set('views','./views/admin')

userRoute.use(passport.initialize())
userRoute.use(passport.session());






//User Home page
userRoute.get('/',userController.loadHome)

userRoute.get('/logOut',userController.userLogOut)




//User registration
userRoute.get('/userRegister',Auth.isLogOut,userController.loadRegister)
userRoute.post('/verifyRegister',Auth.isLogOut,userController.insertUser)



//google Auth
userRoute.get('/login/google',passport.authenticate('google',{scope:['email','profile']}),userController.googleAuth)
userRoute.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),userController.googleAuth)

userRoute.get('/userLogin',Auth.isLogOut,userController.loadLogin)
userRoute.post('/verifylog',Auth.isLogOut,userController.verifyLogin);
userRoute.get('/otpGet',Auth.isLogOut,userController.otpGet)
userRoute.post('/verifyOtp',Auth.isLogOut,userController.verifyOtp)

//forgetPassword
userRoute.get('/emailVerify',Auth.isLogOut,userController.verifyEmail)
userRoute.post('/existUser',Auth.isLogOut,userController.resetPassword)
userRoute.get('/userNewOtp',Auth.isLogOut,userController.resetPasswordOtp)
userRoute.post('/resetOtp',Auth.isLogOut,userController.verifyResetOtp)
userRoute.post('/postPassword',Auth.isLogOut,userController.savePassword)

 
//user inside routes
userRoute.get('/productView',Auth.isLogin,Auth.userBlocked,userController.productDetailedView)
// userRoute.get('/productView',Auth.isLogin,userController.productDetailedView)


// shop paRoutes
userRoute.get('/productShop', Auth.isLogin, userController.productShop);
// userRoute.get('/priceSort', Auth.isLogOut, userController.productShop);

//Whislist Routes

userRoute.get('/wishlistLoad',Auth.isLogin,cartController.loadWishlist)
userRoute.post('/addToWishlist',Auth.isLogin,cartController.addToWishlist)



//cart to Order 
userRoute.get('/cartView',Auth.isLogin,cartController.loadCart)
userRoute.post('/addToCart',Auth.isLogin,cartController.addToCart)
userRoute.post('/updateCart',Auth.isLogin,cartController.updateCart)
userRoute.post('/deleteCartItem',Auth.isLogin,cartController.deleteItemInCart)





// Order procedures
userRoute.get('/checkoutView',Auth.isLogin,orderController.loadCheckout)
userRoute.post('/placeOrder',Auth.isLogin,orderController.codPlaceOrder)
userRoute.post('/onlinePay',Auth.isLogin,orderController.onlinepay)
userRoute.post('/updateOrderStatus',Auth.isLogin,orderController.updateOrderStatus)
userRoute.get('/orderSuccess',Auth.isLogin,orderController.successOrder)


//payment Routes








userRoute.get('/userInfo',Auth.isLogin,userController.userDetails)
userRoute.post('/userAddress',Auth.isLogin,userController.addUserAddress)
userRoute.get('/addressEditView', Auth.isLogin, userController.editAddressPage);
userRoute.post('/editAddress', Auth.isLogin, userController.editAddress);
userRoute.post('/deleteAddress',Auth.isLogin,userController.deleteAddress)
userRoute.get("/orderDetails",Auth.isLogin,userController.orderInfos)






//Search products


userRoute.get('/searchProducts',Auth.isLogin,userController.searchProducts)






















//test route

// userRoute.get('/check',Auth.isLogin,userController.checking)



// userRoute.get('*',Auth.isLogin,userController.errorPage)


module.exports = userRoute;
