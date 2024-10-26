const mongoose = require("mongoose");

const addressSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  name: {
    type: String,
    require: true,
  },
  mobile: {
    type: Number,
    require: true,
  },
  homeAddress: {
    type: String,
    require: true,
  },
  city: {
    type: String,
    require: true,
  },
  district: {
    type: String,
    require: true,
  },
  state: {
    type: String,
    require: true,
  },
  pincode: {
    type: Number,
    require: true,
  },
});

module.exports = mongoose.model("Address", addressSchema);
