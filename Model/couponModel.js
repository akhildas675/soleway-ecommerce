const mongoose = require("mongoose");

const couponSchema = mongoose.Schema({
  couponName: {
    type: String,
    required: true,
  },
  couponCode: {
    type: String,
    required: true,
  },
  minimumPurchase: {
    type: Number,
    required: true
  },
  discountInPercentage: {
    type: Number,
    default: 0,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  timesUsed: {
    type: Number,
    default: 0,
  },
  redeemedUsers: [
    {
      userId: {
        type: String,
      },
      usedTime: { 
        type: Date,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Coupon', couponSchema);
