const { Transaction } = require("mongodb");
const mongoose = require("mongoose");

const walletSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  balance: {
    type: Number,
    required: true,
  },
  history: [
    {
      amount: {
        type: Number,
      },
      status: {
        type: String,
        enum: ["Credit", "Debit"],
      },

      transactionDate: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const Wallet = mongoose.model("Wallet", walletSchema);

module.exports = Wallet;
