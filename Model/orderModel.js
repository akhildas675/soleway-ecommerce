const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  addressName: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  homeAddress: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  pincode: {
    type: String,
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: String,
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      size: {
        type: Number,
        required: true,
      },
    },
  ],
  address: {
    type: addressSchema,
    required: true,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  coupon: {
    couponCode: {
      type: String,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
  },
  orderStatus: {
    type: String,
    enum: [
      "Pending",
      "Order Placed",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returned",
    ],
    default: "Pending",
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Failed", "Received", "Refund"],
    default: "Pending",
  },
  paymentId: {
    type: String,
  },
  paymentMethod: {
    type: String,
    enum: ["COD", "Online", "Wallet"],
  },
  returnReason: {
    type: String,
  },
  cancellationReason: {
    type: String,
  },
  cancellationDate: {
    type: Date,
  },
  returnDate: {
    type: Date,
  },
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;