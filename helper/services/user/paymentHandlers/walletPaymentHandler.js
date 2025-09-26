const Wallet = require('../../../../Model/walletModel');
const createSingleOrder = require('../../../services/user/orderServices');
const {updateProductStock}= require('../../../utils/userUtils/productUtils');
const {clearCart} = require('../../../utils/userUtils/cartUtils')



const handleWalletPayment = async (data) => {
  const { findCart, findAddress, userId, totalAmount, finalAmount, discountAmount, couponDetails, paymentMethod } = data;
  
  // Check wallet balance
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0 });
  }

  if (wallet.balance < finalAmount) {
    return {
      success: false,
      message: "Insufficient wallet balance",
      statusCode: 400
    };
  }

  const orderIds = [];

  
  for (let item of findCart.cartProducts) {
    const product = item.productId;
    const productPrice = product.offerPrice || product.realPrice;
    const productTotal = productPrice * item.quantity;
    const productDiscount = couponDetails.couponCode ? (productTotal / totalAmount) * discountAmount : 0;
    const finalProductTotal = productTotal - productDiscount;

    // Create order
    const orderId = await createSingleOrder({
      item,
      findAddress,
      userId,
      finalProductTotal,
      couponDetails,
      paymentMethod,
      orderStatus: "Order Placed",
      paymentStatus: "Received"
    });

    orderIds.push(orderId);


    wallet.balance -= finalProductTotal;
    wallet.history.push({
      amount: finalProductTotal,
      status: "Debit",
      transactionDate: new Date(),
    });

   
    await updateProductStock(product._id, item.size, item.quantity);
  }

  await wallet.save();
  await clearCart(userId);

  return {
    success: true,
    message: "Order placed successfully and wallet amount deducted",
    orderIds
  };
};

module.exports = { handleWalletPayment };