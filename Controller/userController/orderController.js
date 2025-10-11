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
const { previewCouponDiscount, redeemCoupon } = require("../../helper/services/user/couponServices");

// Razorpay configuration
const Razorpay = require("razorpay");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

// Load Checkout Page
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
    console.error("Error in loadCheckout:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const applyCoupon = async (req, res) => {
  try {
    const { couponCode, totalAmount } = req.body;
    const userId = req.session.userData;

    // console.log('Applying coupon preview:', { couponCode, totalAmount, userId });

    const couponResult = await previewCouponDiscount(couponCode, totalAmount, userId);

    if (!couponResult.success) {
      return res.json({
        success: false,
        message: couponResult.message,
      });
    }

    const discountAmount = couponResult.discountAmount;
    const finalAmount = totalAmount - discountAmount;

    // console.log('Coupon preview result:', {
    //   original: totalAmount,
    //   discount: discountAmount,
    //   final: finalAmount
    // });

    return res.json({
      success: true,
      couponName: couponResult.couponDetails.couponName || couponCode,
      discountAmount: discountAmount.toFixed(2),
      finalAmount: finalAmount.toFixed(2),
      couponCode: couponCode,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return res.json({
      success: false,
      message: "Internal error applying coupon",
    });
  }
};

// Remove Coupon Function
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

// COD Place Order
const codPlaceOrder = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { addressId, paymentMethod, appliedCouponCode } = req.body;

    // console.log('COD Order request:', {
    //   userId,
    //   addressId,
    //   paymentMethod,
    //   appliedCouponCode
    // });

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
    console.error("Error in COD placing order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Wallet Payment
const walletPay = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { addressId, paymentMethod, appliedCouponCode } = req.body;

    // console.log('Wallet payment request:', {
    //   userId,
    //   addressId,
    //   paymentMethod,
    //   appliedCouponCode
    // });

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

// Online Payment


const onlinePay = async (req, res) => {
  try {
    const userId = req.session.userData;
    let { addressId, appliedCouponCode, initial, paymentStatus, paymentId } = req.body;

    console.log('Online payment request:', { 
      addressId, 
      appliedCouponCode, 
      initial, 
      paymentStatus,
      paymentId 
    });

    // Validate user
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "User not authenticated" 
      });
    }

    // Fetch cart and calculate total
    const findCart = await Cart.findOne({ userId }).populate("cartProducts.productId");
    if (!findCart || !findCart.cartProducts || findCart.cartProducts.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No items in cart" 
      });
    }

    // Calculate total from cart
    let totalAmount = findCart.cartProducts.reduce((acc, item) => {
      const productPrice = item.productId.offerPrice || item.productId.realPrice;
      return acc + productPrice * item.quantity;
    }, 0);

    // Apply coupon discount if provided
    let finalAmount = totalAmount;
    if (appliedCouponCode) {
      const couponResult = await previewCouponDiscount(appliedCouponCode, totalAmount, userId);
      
      if (couponResult.success) {
        finalAmount = totalAmount - couponResult.discountAmount;
        console.log('Coupon applied - Original:', totalAmount, 'Final:', finalAmount);
      } else {
        return res.status(400).json({
          success: false,
          message: couponResult.message
        });
      }
    }

    // Initial request - Create Razorpay order only
    if (initial) {
      try {
        const result = await processPurchase({
          userId,
          addressId,
          paymentMethod: 'Online',
          appliedCouponCode,
          initial: true
        });

        if (!result.success) {
          return res.status(result.statusCode || 400).json({ 
            success: false,
            message: result.message 
          });
        }

        return res.json({
          success: true,
          orderId: result.orderId,
          amount: result.amount,
          finalAmount: finalAmount,
          appliedCouponCode,
          razorPayKey:RAZORPAY_ID_KEY,
        });
      } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return res.status(500).json({
          success: false,
          message: "Failed to initiate payment"
        });
      }
    } 
    
   
    else {
      
      const status = paymentId ? 'Received' : 'Failed';
      
      // console.log('Creating order with payment status:', status);

      try {
        const result = await processPurchase({
          userId,
          addressId,
          paymentMethod: 'Online',
          appliedCouponCode,
          paymentStatus: status,
          paymentId: paymentId || null,
          initial: false
        });

        if (!result.success) {
          return res.status(result.statusCode || 400).json({ 
            success: false,
            message: result.message 
          });
        }

        // Success response
        return res.json({
          success: true,
          message: result.message,
          orderIds: result.orderIds,
          orderStatus: result.orderStatus,
          paymentStatus: result.paymentStatus
        });
      } catch (error) {
        console.error('Error creating order:', error);
        return res.status(500).json({
          success: false,
          message: "Failed to create order"
        });
      }
    }
  } catch (error) {
    console.error("Error in online payment:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error" 
    });
  }
};

const rePayment = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { orderId, paymentId } = req.body;

    // console.log('Re-payment request:', { userId, orderId, paymentId });

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

// Update Order Status
const updateOrderStatus = async (req, res) => {
  try {
    const { paymentId, orderId, paymentStatus, couponCode } = req.body;
    const userId = req.session.userData;

    // console.log('Updating order status:', {
    //   paymentId,
    //   orderId, 
    //   paymentStatus,
    //   couponCode
    // });

    // Update order status
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus,
      paymentId,
      orderStatus: "Order Placed",
    });

    // If payment is successful and there's a coupon, redeem it now
    if (paymentStatus === "Received" && couponCode) {
      const redemptionResult = await redeemCoupon(couponCode, userId);
      
      if (redemptionResult.success) {
        console.log('Coupon redeemed after successful payment');
      } else {
        console.warn('Failed to redeem coupon after payment:', redemptionResult.message);
      }
    }

    res.json({
      message: "Order status updated successfully",
      paymentStatus,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Order Success Page
const successOrder = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    res.render("orderSuccess", { findUser });
  } catch (error) {
    console.error("Error in successOrder:", error);
    res.status(500).send("Server Error");
  }
};

// Cancel Order
const cancellation = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { orderId, actionType } = req.body;

    // console.log('Order cancellation request:', { userId, orderId, actionType });

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

// Return Order
const returnOrder = async (req, res) => {
  try {
    const { returnReason, orderId } = req.body;
    const userId = req.session.userData;

    // console.log('Order return request:', { returnReason, orderId, userId });

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

   
    matchSizeAndQuantity.quantity += parseInt(productQ);
    await thisIsTheProduct.save();

   
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

// Get Invoice
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
    console.error("Error in getInvoice:", error);
    res.status(500).send("Server error");
  }
};

// Download Invoice
const invoiceDownload = async (req, res) => {
  try {
    const orderId = req.params.orderId;

 
    const order = await Order.findOne({ orderId: orderId }).populate(
      "products.productId"
    );

    if (!order) {
      return res.status(404).send("Order not found");
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

  
    const invoiceUrl = `${req.protocol}://${req.get(
      "host"
    )}/order/invoice/${orderId}`;

   
    await page.goto(invoiceUrl, { waitUntil: "networkidle0" });

   
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice_${orderId}.pdf`
    );

    res.send(pdf);
  } catch (error) {
    console.error("Error in invoiceDownload:", error);
    res.status(500).send("Server error");
  }
};

module.exports = {
  loadCheckout,
  applyCoupon,
  removeCoupon,
  codPlaceOrder,
  walletPay,
  onlinePay,
  rePayment,
  updateOrderStatus,
  successOrder,
  cancellation,
  returnOrder,
  getInvoice,
  invoiceDownload,
};