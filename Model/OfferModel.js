const mongoose = require("mongoose");

const offerSchema = mongoose.Schema({
  offerName: {
    type: String,
    required: true,
  },
  offerPercentage: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true, 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Offer", offerSchema);
