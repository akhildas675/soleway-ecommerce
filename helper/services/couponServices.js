const Coupon = require("../../Model/couponModel");

const applyCoupon = async (couponCode, totalAmount, userId) => {
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

    //Check if it is already redeemed

    const userRedeemed = coupon.redeemedUsers.some(
      (user) => user.userId == userId
    );

    if (userRedeemed) {
      return {
        success: false,
        message: "Coupon already redeemed",
        statuscode: 400,
      };
    }

    //Check the minimum price

    if (totalAmount < coupon.minimumPurchase) {
      return {
        success: false,
        message: `Minimum purchase of ${coupon.minimumPurchase} required  to use this coupon`,
        statuscode: 400,
      };
    }

    const discountAmount = (totalAmount * coupon.discountInPercentage) / 100;

    // Marked as redeemed

    coupon.redeemedUsers.push({
      userId: userId,
      usedTime: new Date(),
    });

    coupon.timeUsed++;
    await coupon.save();

    return {
      success: true,
      couponDetails: {
        couponCode: coupon.couponCode,
        discountAmount: discountAmount.toFixed(2),
      },
      discountAmount,
    };
  } catch (error) {
    console.error("Error applying coupon:", error);
    return {
      success: false,
      message: "Error applying coupon",
      statusCode: 500,
    };
  }
};

module.export = { applyCoupon };
