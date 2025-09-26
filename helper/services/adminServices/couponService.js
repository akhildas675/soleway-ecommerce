const Coupon = require("../../../Model/couponModel");

const validateCouponData = (data) => {
  const { couponName, couponCode, minimumPurchase, discountInPercentage, expiryDate } = data;
  let errors = [];

  if (!couponName || couponName.trim() === "") {
    errors.push("Please enter a valid coupon name");
  }

  if (!couponCode || couponCode.trim() === "") {
    errors.push("Please enter a valid coupon code.");
  } else if (couponCode.trim().length < 5 || couponCode.trim().length > 10) {
    errors.push("Coupon code must be between 5 and 10 characters long.");
  }

  if (!minimumPurchase || isNaN(minimumPurchase) || minimumPurchase <= 0) {
    errors.push("Please enter a valid minimum purchase amount.");
  }

  if (!discountInPercentage || isNaN(discountInPercentage) || discountInPercentage <= 0 || discountInPercentage >= 50) {
    errors.push("Please enter a valid discount percentage (0 < discount < 50).");
  }

  if (!expiryDate) {
    errors.push("Please enter the expiry date.");
  } else {
    const today = new Date();
    const expiry = new Date(expiryDate);
    if (expiry <= today) {
      errors.push("Expiry date must be a future date.");
    }
  }

  return errors;
};

const validateEditCouponData = (data) => {
  const { couponName, couponCode, minimumPurchase, discountInPercentage, expiryDate } = data;
  let errors = [];

  if (!couponName || couponName.trim() === "" || couponName.length < 3) {
    errors.push("Please Enter a valid Coupon Name");
  }

  if (!couponCode || couponCode.trim() === "") {
    errors.push("Please Enter a valid Coupon Code");
  } else if (couponCode.trim().length < 5 || couponCode.trim().length > 10) {
    errors.push("Coupon code must be between 5 and 10 characters long");
  }

  if (!minimumPurchase || isNaN(minimumPurchase) || minimumPurchase < 1000) {
    errors.push("Minimum purchase amount must be greater than 1000.");
  }

  if (!discountInPercentage || isNaN(discountInPercentage) || discountInPercentage <= 0 || discountInPercentage >= 70) {
    errors.push("Please enter a valid discount percentage between 0 and 70");
  }

  if (!expiryDate) {
    errors.push("Please enter the expiry date.");
  } else {
    const today = new Date();
    const expiry = new Date(expiryDate);
    if (expiry <= today) {
      errors.push("Expiry date must be a future date");
    }
  }

  return errors;
};

const getAllCoupons = async () => {
  return await Coupon.find().sort({ createdAt: -1 });
};

const getCouponById = async (id) => {
  return await Coupon.findById(id);
};

const createCoupon = async (couponData) => {
  const { couponName, couponCode, minimumPurchase, discountInPercentage, expiryDate } = couponData;
  
  const upperCaseCode = couponCode.toUpperCase();
  const upperCaseName = couponName.toUpperCase();

  // Check if coupon code already exists
  const existingCoupon = await Coupon.findOne({ couponCode: upperCaseCode });
  if (existingCoupon) {
    throw new Error("Coupon code already exists. Please use a different code.");
  }

  const newCoupon = new Coupon({
    couponName: upperCaseName,
    couponCode: upperCaseCode,
    minimumPurchase,
    discountInPercentage,
    expiryDate,
  });

  return await newCoupon.save();
};

const updateCoupon = async (couponId, couponData) => {
  const { couponName, couponCode, minimumPurchase, discountInPercentage, expiryDate } = couponData;
  
  const upperCase = couponCode.toUpperCase();

  return await Coupon.findByIdAndUpdate(couponId, {
    couponName,
    couponCode: upperCase,
    minimumPurchase,
    discountInPercentage,
    expiryDate,
  });
};

const toggleCouponStatus = async (couponId, isActive) => {
  return await Coupon.findByIdAndUpdate(couponId, { isActive });
};

const deleteCoupon = async (couponId) => {
  return await Coupon.findByIdAndDelete(couponId);
};

module.exports = {
  validateCouponData,
  validateEditCouponData,
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon
};
