// Fixed purchaseServices.js
const User = require("../../../Model/userModel");
const Cart = require("../../../Model/cartModel");
const Address = require("../../../Model/addressModel");
const { previewCouponDiscount, redeemCoupon } = require("../userServices/couponServices");
const { handleCODPayment } = require("../userServices/paymentHandlers/codPaymentHandler");
const { handleWalletPayment } = require("../userServices/paymentHandlers/walletPaymentHandler");
const { handleOnlinePayment } = require("../userServices/paymentHandlers/onlinePaymentHandler");

const processPurchase = async (purchaseData) => {
  const {
    userId,
    addressId,
    paymentMethod,
    appliedCouponCode = null,
    paymentStatus = "Received",
    paymentId = null,
    initial = false,
  } = purchaseData;

  try {
    // console.log('Processing purchase with data:', {
    //   userId,
    //   paymentMethod,
    //   appliedCouponCode,
    //   paymentStatus,
    //   initial
    // });


    const findUser = await User.findById(userId);
    const findCart = await Cart.findOne({ userId }).populate("cartProducts.productId");
    const findAddress = await Address.findById(addressId);

    if (!findUser || !findCart || !findAddress) {
      return { success: false, message: "Invalid user, cart, or address", statusCode: 400 };
    }

    if (!findCart.cartProducts || findCart.cartProducts.length === 0) {
      return { success: false, message: "No products in the cart", statusCode: 400 };
    }

 
    let totalAmount = findCart.cartProducts.reduce((acc, item) => {
      const productPrice = item.productId.offerPrice || item.productId.realPrice;
      return acc + productPrice * item.quantity;
    }, 0);

    // console.log('Original total amount:', totalAmount);

 
    let couponDetails = {};
    let discountAmount = 0;
    
    if (appliedCouponCode) {
      // console.log('Previewing coupon:', appliedCouponCode);
      const couponResult = await previewCouponDiscount(appliedCouponCode, totalAmount, userId);
      
      if (!couponResult.success) {
        // console.log('Coupon validation failed:', couponResult.message);
        return couponResult;
      }
      
      couponDetails = couponResult.couponDetails;
      discountAmount = couponResult.discountAmount;
      // console.log('Coupon discount amount:', discountAmount);
    }

    const finalAmount = totalAmount - discountAmount;
    // console.log('Final amount after discount:', finalAmount);

    // Handle different payment methods
    let result;
    const paymentData = {
      findCart, 
      findAddress, 
      userId,
      totalAmount, 
      finalAmount, 
      discountAmount,
      couponDetails, 
      paymentMethod,
      paymentStatus, 
      paymentId, 
      initial
    };

    switch (paymentMethod) {
      case "COD":
        result = await handleCODPayment(paymentData);
        break;
      case "Wallet":
        result = await handleWalletPayment(paymentData);
        break;
      case "Online":
        result = await handleOnlinePayment(paymentData);
        break;
      default:
        return { success: false, message: "Invalid payment method", statusCode: 400 };
    }

    //  Redeem coupon only after successful payment/order creation
    
    if (result.success && appliedCouponCode && !initial) {

      // console.log('Payment successful, redeeming coupon:', appliedCouponCode);
      
      // Only redeem if payment was successful 
      if (paymentMethod !== "Online" || paymentStatus === "Received") {

        const redemptionResult = await redeemCoupon(appliedCouponCode, userId);

        if (redemptionResult.success) {

          // console.log('Coupon redeemed successfully');

        } else {
          console.warn('Coupon redemption failed:', redemptionResult.message);
          
        }
      }
    }

    return result;

  } catch (error) {
    console.error("Error in processPurchase:", error);
    return { success: false, message: "Internal Server Error", statusCode: 500 };
  }
};

module.exports = { processPurchase };