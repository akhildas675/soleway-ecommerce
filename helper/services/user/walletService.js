const Wallet = require("../../../Model/walletModel");
const Razorpay = require("razorpay");

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

const createRazorpayOrder = async (amount) => {
  return await instance.orders.create({
    amount: amount * 100,
    currency: "INR",
  });
};

const processWalletPayment = async (userId, paymentId, amount) => {
  // Fetch and capture payment
  let payment = await instance.payments.fetch(paymentId);
  
  if (payment.status !== 'captured') {
    payment = await instance.payments.capture(paymentId, amount * 100, "INR");
  }

  if (payment.status !== 'captured') {
    throw new Error('Payment not captured');
  }

  // Update wallet
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = new Wallet({
      userId,
      balance: amount,
      history: [{ amount, status: 'Credit', transactionDate: Date.now() }],
    });
  } else {
    wallet.balance += amount;
    wallet.history.push({
      amount,
      status: 'Credit',
      transactionDate: new Date(),
    });
  }

  return await wallet.save();
};

module.exports = { createRazorpayOrder, processWalletPayment };