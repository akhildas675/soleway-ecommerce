// Fixed couponServices.js
const Coupon = require("../../../Model/couponModel");

// Separate function for preview (validation only)
const previewCouponDiscount = async (couponCode, totalAmount, userId) => {
  try {
    const coupon = await Coupon.findOne({
      couponCode: couponCode,
      isActive: true,
      expiryDate: { $gte: Date.now() },
    });

    if (!coupon) {
      return {
        success: false,
        message: "Invalid or expired coupon",
        statusCode: 400,
      };
    }

    // Check if already redeemed
    const userRedeemed = coupon.redeemedUsers.some(
      (user) => user.userId.toString() === userId.toString()
    );
    if (userRedeemed) {
      return {
        success: false,
        message: "Coupon already redeemed",
        statusCode: 400,
      };
    }

    // Check minimum purchase
    if (totalAmount < coupon.minimumPurchase) {
      return {
        success: false,
        message: `Minimum purchase of ₹${coupon.minimumPurchase} required to use this coupon`,
        statusCode: 400,
      };
    }

    const discountAmount = (totalAmount * coupon.discountInPercentage) / 100;

    return {
      success: true,
      couponDetails: {
        couponCode: coupon.couponCode,
        couponName: coupon.couponName,
        discountPercentage: coupon.discountInPercentage,
        discountAmount: discountAmount,
      },
      discountAmount,
    };
  } catch (error) {
    console.error("Error previewing coupon:", error);
    return {
      success: false,
      message: "Error validating coupon",
      statusCode: 500,
    };
  }
};

// Function to actually redeem the coupon (only after successful payment)
const redeemCoupon = async (couponCode, userId) => {
  try {
    const coupon = await Coupon.findOne({
      couponCode: couponCode,
      isActive: true,
      expiryDate: { $gte: Date.now() },
    });

    if (!coupon) {
      return { success: false, message: "Coupon not found" };
    }

    // Double check if already redeemed
    const userRedeemed = coupon.redeemedUsers.some(
      (user) => user.userId.toString() === userId.toString()
    );
    if (userRedeemed) {
      return { success: false, message: "Coupon already redeemed" };
    }

    // Mark as redeemed
    coupon.redeemedUsers.push({
      userId: userId,
      usedTime: new Date(),
    });
    coupon.timeUsed++;
    await coupon.save();

    console.log(`Coupon ${couponCode} successfully redeemed for user ${userId}`);
    return { success: true, message: "Coupon redeemed successfully" };
  } catch (error) {
    console.error("Error redeeming coupon:", error);
    return { success: false, message: "Error redeeming coupon" };
  }
};

// Legacy function for backward compatibility (now uses preview)
const applyCouponLogic = async (couponCode, totalAmount, userId, previewOnly = false) => {
  if (previewOnly) {
    return await previewCouponDiscount(couponCode, totalAmount, userId);
  } else {
    // This should not be used anymore - use redeemCoupon separately
    console.warn("applyCouponLogic called without previewOnly flag - this is deprecated");
    return await previewCouponDiscount(couponCode, totalAmount, userId);
  }
};

module.exports = { 
  applyCouponLogic, 
  previewCouponDiscount, 
  redeemCoupon 
};