const User = require("../../../Model/userModel");
const Cart = require("../../../Model/cartModel");
const Address = require("../../../Model/addressModel");
const { applyCouponLogic } = require("../user/couponServices");
const { handleCODPayment } = require("../user/paymentHandlers/codPaymentHandler");
const { handleWalletPayment } = require("../user/paymentHandlers/walletPaymentHandler");
const { handleOnlinePayment } = require("../user/paymentHandlers/onlinePaymentHandler");

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
    // 1. Validate and fetch required data
    const findUser = await User.findById(userId);
    const findCart = await Cart.findOne({ userId }).populate("cartProducts.productId");
    const findAddress = await Address.findById(addressId);

    if (!findUser || !findCart || !findAddress) {
      return {
        success: false,
        message: "Invalid user, cart, or address",
        statusCode: 400
      };
    }

    if (!findCart.cartProducts || findCart.cartProducts.length === 0) {
      return {
        success: false,
        message: "No products in the cart",
        statusCode: 400
      };
    }

    // 2. Calculate total amount
    let totalAmount = findCart.cartProducts.reduce((acc, item) => {
      const productPrice = item.productId.offerPrice || item.productId.realPrice;
      return acc + productPrice * item.quantity;
    }, 0);

    // 3. Handle coupon logic
    let couponDetails = {};
    let discountAmount = 0;

    if (appliedCouponCode) {
      const couponResult = await applyCouponLogic(appliedCouponCode, totalAmount, userId);
      if (!couponResult.success) {
        return couponResult;
      }
      couponDetails = couponResult.couponDetails;
      discountAmount = couponResult.discountAmount;
    }

    const finalAmount = totalAmount - discountAmount;

    // 4. Handle different payment methods
    switch (paymentMethod) {
      case 'COD':
        return await handleCODPayment({
          findCart,
          findAddress,
          userId,
          totalAmount,
          discountAmount,
          couponDetails,
          paymentMethod
        });

      case 'Wallet':
        return await handleWalletPayment({
          findCart,
          findAddress,
          userId,
          totalAmount,
          finalAmount,
          discountAmount,
          couponDetails,
          paymentMethod
        });

      case 'Online':
        return await handleOnlinePayment({
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
        });

      default:
        return {
          success: false,
          message: "Invalid payment method",
          statusCode: 400
        };
    }

  } catch (error) {
    console.error("Error in processPurchase:", error);
    return {
      success: false,
      message: "Internal Server Error",
      statusCode: 500
    };
  }
};

module.exports = { processPurchase };