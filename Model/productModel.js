const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

const sizeSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    default: 0,
  },
});

const reviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: false,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
});

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
    },
    realPrice: {
      type: Number,
    },
    brandName: {
      type: String,
      required: true,
    },
    offer: {
      type: Number,
    },
    sizes: [sizeSchema],
    description: {
      type: String,
    },
    images: {
      type: Array,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    categoryId: {
      type: ObjectId,
      ref: "Category",
      required: true,
    },
    offerId: {
      type: ObjectId,
      ref: "Offer",
      required: false,
    },
    review: [reviewSchema],
    date: {
      type: Date,
      default: Date.now,
    },
    offerPrice: {
      type: Number,
      required: false,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("Product", productSchema);
