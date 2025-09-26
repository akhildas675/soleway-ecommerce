const User = require('../../Model/userModel');
const Products = require("../../Model/productModel");
const Cart = require("../../Model/cartModel");
const Order = require("../../Model/orderModel");
const Address = require("../../Model/addressModel");
const Wallet = require("../../Model/walletModel");
const Coupon = require("../../Model/couponModel");
const puppeteer = require("puppeteer");

// Import services
const { processPurchase } = require('../../helper/services/user/purchaseServices');
const { updateProductStock } = require("../../helper/utils/userUtils/productUtils");

// Razorpay configuration (you can move this to config file)
const Razorpay = require("razorpay");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

// ===================== CONTROLLER FUNCTIONS =====================

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.userData;
    if (!userId) {
      return res.status(400).json({ error: "User not logged in" });
    }

    const findUser = await User.findById(userId);
    const findCartItems = await Cart.findOne({ userId }).populate({
      path: "cartProducts.productId",
      populate: {
        path: "offerId",
        model: "Offer",
      },
    });

    // Store the error messages 
    let adjustments = []; 

    for (let item of findCartItems.cartProducts) {
      const product = await Products.findById(item.productId);
      if (product) {
        const selectedSize = product.sizes.find((size) => size.size === item.size);
    
        if (selectedSize) {
          if (item.quantity > selectedSize.quantity) {
            item.quantity = selectedSize.quantity; 
            adjustments.push({
              productName: product.productName,
              message: `Sorry for the inconvenience. The quantity for ${product.productName} in size ${item.size} has been adjusted to the available stock of ${selectedSize.quantity}.`,
            });
          }
        } else {
          const availableSize = product.sizes.find((size) => size.quantity > 0);
          if (availableSize) {
            item.size = availableSize.size;
            item.quantity = Math.min(item.quantity, availableSize.quantity);
            adjustments.push({
              productName: product.productName,
              message: `The selected size for ${product.productName} is currently out of stock. We've updated your selection to size ${availableSize.size} with available stock: ${availableSize.quantity}.`,
            });
          } else {
            adjustments.push({
              productName: product.productName,
              message: `Unfortunately, ${product.productName} is currently out of stock. Please check back later or explore similar products.`,
            });
          }
        }
      }
    }
    
    await findCartItems.save();

    const coupon = await Coupon.find({
      isActive: true,
      expiryDate: { $gte: Date.now() },
      "redeemedUsers.userId": { $nin: [userId] },
    });

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0 });
    }

    const findAddress = await Address.find({ userId });

    res.render("checkout", {
      findUser,
      findCartItems,
      findAddress,
      coupon,
      wallet,
      adjustments,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Apply Coupon Function (for frontend validation)
const applyCoupon = async (req, res) => {
  try {
    const { couponCode, totalAmount } = req.body;
    const userId = req.session.userData;

    const coupon = await Coupon.findOne({
      couponCode: couponCode,
      isActive: true,
      expiryDate: { $gte: Date.now() },
    });

    if (!coupon) {
      return res.json({
        success: false,
        message: "Coupon not found or expired",
      });
    }

    const userRedeemed = coupon.redeemedUsers.some(
      (user) => user.userId == userId
    );
    if (userRedeemed) {
      return res.json({
        success: false,
        message: "Coupon already redeemed.",
      });
    }

    if (totalAmount < coupon.minimumPurchase) {
      return res.json({
        success: false,
        message: `Coupon requires a minimum purchase of ₹${coupon.minimumPurchase}`,
      });
    }

    const discountAmount = (totalAmount * coupon.discountInPercentage) / 100;
    const finalAmount = totalAmount - discountAmount;

    return res.json({
      success: true,
      couponName: coupon.couponName,
      discountAmount: discountAmount.toFixed(2),
      finalAmount: finalAmount.toFixed(2),
      couponCode: coupon.couponCode,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return res.json({
      success: false,
      message: "Internal error applying coupon",
    });
  }
};

const removeCoupon = (req, res) => {
  try {
    return res.json({
      success: true,
      message: "Coupon removed successfully",
    });
  } catch (error) {
    console.error("Error removing coupon:", error);
    return res.json({
      success: false,
      message: "Internal error removing coupon",
    });
  }
};

// ===================== PAYMENT CONTROLLER FUNCTIONS =====================

const codPlaceOrder = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { addressId, paymentMethod, appliedCouponCode } = req.body;

    const result = await processPurchase({
      userId,
      addressId,
      paymentMethod: 'COD',
      appliedCouponCode
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ message: result.message });
    }

    res.json({ 
      message: result.message, 
      orderIds: result.orderIds 
    });

  } catch (error) {
    console.error("Error in placing order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const walletPay = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { addressId, paymentMethod, appliedCouponCode } = req.body;

    const result = await processPurchase({
      userId,
      addressId,
      paymentMethod: 'Wallet',
      appliedCouponCode
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ 
        success: false,
        message: result.message 
      });
    }

    return res.json({
      success: true,
      message: result.message,
      orderIds: result.orderIds
    });

  } catch (error) {
    console.error("Error in wallet payment:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error processing order" 
    });
  }
};

const onlinepay = async (req, res) => {
  try {
    const userId = req.session.userData;
    const {
      addressId,
      paymentMethod,
      paymentStatus,
      paymentId,
      appliedCouponCode,
      initial,
    } = req.body;

    const result = await processPurchase({
      userId,
      addressId,
      paymentMethod: 'Online',
      appliedCouponCode,
      paymentStatus,
      paymentId,
      initial
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ message: result.message });
    }

    if (result.orderId && result.amount) {
      return res.json({
        message: result.message,
        orderId: result.orderId,
        amount: result.amount,
      });
    }

    return res.json({
      message: result.message,
      orderIds: result.orderIds,
    });

  } catch (error) {
    console.error("Error in online payment processing:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const rePayment = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { orderId, paymentId } = req.body;

    const findOrder = await Order.findById(orderId);
    if (!findOrder) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    const totalAmount = findOrder.totalAmount;

    if (!paymentId) {
      const razorpayOrder = await instance.orders.create({
        amount: totalAmount * 100,
        currency: "INR",
        receipt: `receipt_${orderId}`,
        payment_capture: 1,
      });

      return res.json({
        success: true,
        message: "Payment initiated, awaiting payment confirmation",
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
      });
    } else {
      findOrder.paymentId = paymentId;
      findOrder.orderStatus = "Order Placed";
      findOrder.paymentStatus = "Received";

      for (const item of findOrder.products) {
        await updateProductStock(item.productId, item.size, item.quantity);
      }
      
      await findOrder.save();

      return res.json({
        success: true,
        message: "Payment successful, order status updated to 'Order Placed', and stock adjusted",
      });
    }
  } catch (error) {
    console.error("Error in rePayment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { paymentId, orderId, paymentStatus } = req.body;

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus,
      paymentId,
      orderStatus: "Order Placed",
    });

    res.json({
      message: "Order status updated successfully",
      paymentStatus,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const successOrder = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    res.render("orderSuccess", { findUser });
  } catch (error) {
    console.log(error);
  }
};

const cancelation = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { orderId, actionType } = req.body;

    const findOrder = await Order.findById(orderId);
    if (!findOrder) {
      console.error("Order not found with ID:", orderId);
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    const { paymentMethod, orderStatus, paymentStatus, products, totalAmount } = findOrder;

    if (products.length === 0) {
      console.error("No products found in the order:", orderId);
      return res.status(400).json({
        message: "No products found in this order.",
      });
    }

    const { productId: orderProductData, quantity: productQ, size } = products[0];
    const orderProductId = orderProductData.toHexString();

    const thisIsTheProduct = await Products.findById(orderProductId);
    if (!thisIsTheProduct) {
      console.error("Product not found with ID:", orderProductId);
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    let matchSizeAndQuantity = thisIsTheProduct.sizes.find(
      (sizeObj) => sizeObj.size === size.toString()
    );

    if (!matchSizeAndQuantity) {
      console.error("Size does not match:", size);
      return res.status(400).json({
        message: "Size does not match.",
      });
    }

    if (
      actionType === "cancel" &&
      (paymentMethod === "Online" || paymentMethod === "COD" || paymentMethod === "Wallet") &&
      orderStatus === "Order Placed" &&
      paymentStatus === "Received"
    ) {
      // Increase product stock
      matchSizeAndQuantity.quantity += parseInt(productQ);
      await thisIsTheProduct.save();

      // Update order status
      await Order.findByIdAndUpdate(orderId, {
        orderStatus: "Cancelled",
      });

      // Refund to wallet
      let wallet = await Wallet.findOne({ userId });
      const orderAmount = totalAmount || 0;
      if (!wallet) {
        wallet = new Wallet({
          userId: userId,
          balance: orderAmount,
          history: [
            {
              amount: orderAmount,
              status: "Credit",
              transactionDate: new Date(),
            },
          ],
        });
      } else {
        wallet.balance += orderAmount;
        wallet.history.push({
          amount: orderAmount,
          status: "Credit",
          transactionDate: new Date(),
        });
      }
      await wallet.save();

      return res.json({
        message: "Your order has been canceled successfully and your wallet has been refunded.",
        orderStatus: "Cancelled",
      });
    } else {
      console.error("Order cannot be processed for cancellation. Check conditions.");
      return res.status(400).json({
        message: "Order cannot be canceled under the current conditions.",
      });
    }
  } catch (error) {
    console.error("Error during cancellation process:", error);
    return res.status(500).json({
      message: "An error occurred during the cancellation process. Please try again later.",
    });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { returnReason, orderId } = req.body;
    const userId = req.session.userData;

    if (!returnReason) {
      return res.status(400).json({
        message: "Return reason is required.",
        success: false,
      });
    }

    const findOrder = await Order.findById(orderId);
    if (!findOrder) {
      return res.status(404).json({
        message: "Order not found",
        success: false,
      });
    }

    const { paymentMethod, orderStatus, paymentStatus, products, totalAmount } = findOrder;

    if (orderStatus !== "Delivered" || paymentStatus !== "Received") {
      return res.status(400).json({
        message: "Order is not eligible for return.",
        success: false,
      });
    }

    if (products.length === 0) {
      console.error("No products found in the Order");
      return res.status(404).json({
        message: "No products found in the order.",
        success: false,
      });
    }

    const { productId: orderProductData, quantity: productQ, size } = products[0];
    const orderProductId = orderProductData.toHexString();

    const thisIsTheProduct = await Products.findById(orderProductId);
    if (!thisIsTheProduct) {
      console.error("Product not found with ID:", orderProductId);
      return res.status(404).json({
        message: "Product not found.",
        success: false,
      });
    }

    let matchSizeAndQuantity = thisIsTheProduct.sizes.find(
      (sizeObj) => sizeObj.size === size.toString()
    );

    if (!matchSizeAndQuantity) {
      console.error("Size does not match", size);
      return res.status(400).json({
        message: "Size does not match",
        success: false,
      });
    }

    // Update the product quantity back in inventory
    matchSizeAndQuantity.quantity += parseInt(productQ);
    await thisIsTheProduct.save();

    // Update the order status and add the return reason
    const updatedOrder = await Order.findByIdAndUpdate(orderId, {
      orderStatus: "Returned",
      returnReason: returnReason,
    });

    if (!updatedOrder) {
      return res.status(500).json({
        message: "Failed to update order status",
        success: false,
      });
    }

    // Refund to wallet
    let wallet = await Wallet.findOne({ userId });
    const orderAmount = totalAmount || 0;
    if (!wallet) {
      wallet = new Wallet({
        userId: userId,
        balance: orderAmount,
        history: [
          {
            amount: orderAmount,
            status: "Credit",
            transactionDate: new Date(),
          },
        ],
      });
    } else {
      wallet.balance += orderAmount;
      wallet.history.push({
        amount: orderAmount,
        status: "Credit",
        transactionDate: new Date(),
      });
    }
    await wallet.save();

    return res.json({
      message: "Your order has been returned successfully and your wallet has been refunded.",
      orderStatus: "Returned",
      success: true,
    });
  } catch (error) {
    console.error("Error in return order:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

const getInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findOne({ orderId: orderId }).populate({
      path: "products.productId",
      model: "Product",
      select: "productName offerPrice",
    });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("invoice", { order });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
};

const invoiceDownload = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Get order with product details
    const order = await Order.findOne({ orderId: orderId }).populate(
      "products.productId"
    );

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Create the invoice URL
    const invoiceUrl = `${req.protocol}://${req.get(
      "host"
    )}/order/invoice/${orderId}`;

    // Navigate to the invoice page
    await page.goto(invoiceUrl, { waitUntil: "networkidle0" });

    // Generate the PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // Set headers for file download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${orderId}.pdf`
    );

    // Send the PDF file as a response
    res.send(pdf);
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error");
  }
};

module.exports = {
  loadCheckout,
  applyCoupon,
  removeCoupon,
  codPlaceOrder,
  walletPay,
  onlinepay,
  rePayment,
  updateOrderStatus,
  successOrder,
  cancelation,
  returnOrder,
  getInvoice,
  invoiceDownload,
};