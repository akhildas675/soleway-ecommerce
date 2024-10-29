const User = require("../../Model/userModel");
const Category = require("../../Model/categoryModel");
const Products = require("../../Model/productModel");
const Cart = require("../../Model/cartModel");
const Order = require("../../Model/orderModel");
const bcrypt = require("bcrypt");
const Address = require("../../Model/addressModel");
const nodemailer = require("nodemailer");
const session = require("express-session");
const { json } = require("body-parser");
const Razorpay = require("razorpay");
const Wallet = require("../../Model/walletModel");
const Coupon = require("../../Model/couponModel");
const { default: mongoose } = require("mongoose");
const puppeteer = require("puppeteer");

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


    //store the error messages
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


// Apply Coupon Function
const applyCoupon = async (req, res) => {
  try {
    const { couponCode, totalAmount } = req.body;
    const userId = req.session.userData;

    // console.log("Coupon Code:", couponCode);

    // Check if the coupon is valid
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

    // Check if the user has already redeemed this coupon
    const userRedeemed = coupon.redeemedUsers.some(
      (user) => user.userId == userId
    );
    if (userRedeemed) {
      return res.json({
        success: false,
        message: "Coupon already redeemed.",
      });
    }

    // Check if the total amount meets the coupon's minimum purchase requirement
    if (totalAmount < coupon.minimumPurchase) {
      return res.json({
        success: false,
        message: `Coupon requires a minimum purchase of ₹${coupon.minimumPurchase}`,
      });
    }

    // Calculate discount and final amount
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

const codPlaceOrder = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { addressId, paymentMethod, appliedCouponCode } = req.body;

    // console.log("Received order data:", req.body);

    // Find user, cart, and address
    const findUser = await User.findById(userId);
    const findCart = await Cart.findOne({ userId: userId }).populate(
      "cartProducts.productId"
    );
    const findAddress = await Address.findById(addressId);

    // console.log("Find User:", findUser);
    // console.log("Find Cart:", findCart);
    // console.log("Find Address:", findAddress);

    // Validation user, cart, adnd address
    if (!findUser || !findCart || !findAddress) {
      // console.log("Invalid user, cart, or address");
      return res
        .status(400)
        .json({ message: "Invalid user, cart, or address" });
    }

    // Check cart is empty or not
    if (!findCart.cartProducts || findCart.cartProducts.length === 0) {
      // console.log("No products in the cart");
      return res.status(400).json({ message: "No products in the cart" });
    }

    // Calculate the total amount and handle coupon discount
    let couponDetails = {};
    let discountAmount = 0;
    let totalAmount = findCart.cartProducts.reduce((acc, item) => {
      const productPrice = item.productId.offerPrice
        ? item.productId.offerPrice
        : item.productId.realPrice;
      return acc + productPrice * item.quantity;
    }, 0);

    // console.log("Total Amount:", totalAmount);
    // console.log("Applied coupon from cod:", appliedCouponCode);

    // Check if the coupon is valid and apply it
    if (appliedCouponCode) {
      const coupon = await Coupon.findOne({
        couponCode: appliedCouponCode,
        expiryDate: { $gte: Date.now() },
      });

      if (coupon) {
        // console.log("Coupon:", coupon);

        if (totalAmount >= coupon.minimumPurchase) {
          discountAmount = (totalAmount * coupon.discountInPercentage) / 100;
          couponDetails = {
            couponCode: coupon.couponCode,
            discountAmount: discountAmount.toFixed(2),
          };

          // console.log("Discount Amount from cod:", discountAmount);

          // Redeem the coupon after placing the order
          coupon.redeemedUsers.push({
            userId: userId,
            usedTime: new Date(),
          });
          coupon.timesUsed++;
          await coupon.save();
        } else {
          return res.json({
            message: `Minimum purchase of ₹${coupon.minimumPurchase} required to use this coupon`,
          });
        }
      } else {
        return res.json({ message: "Invalid or expired coupon" });
      }
    }

    // Generate a custom order ID function
    function generateOrderId() {
      const timeAndDate = Date.now().toString();
      const randomChars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let orderId = "OID";
      while (orderId.length < 13) {
        const randomIndex = Math.floor(Math.random() * randomChars.length);
        orderId += randomChars.charAt(randomIndex);
      }
      return orderId + timeAndDate;
    }

    const orderIds = [];

    // create individual orders
    for (let item of findCart.cartProducts) {
      const product = item.productId;
      const productPrice = product.offerPrice
        ? product.offerPrice
        : product.realPrice;
      const productTotal = productPrice * item.quantity;

      // Calculate the proportional discount
      const productDiscount = appliedCouponCode
        ? (productTotal / totalAmount) * discountAmount
        : 0;

      const finalProductTotal = productTotal - productDiscount;

      // Create a new order for each product
      const newOrderId = generateOrderId();
      const newOrder = new Order({
        userId: userId,
        orderId: newOrderId,
        products: [
          {
            productId: product._id,
            quantity: item.quantity,
            size: item.size,
          },
        ],
        address: {
          addressName: findAddress.name,
          mobile: findAddress.mobile,
          homeAddress: findAddress.homeAddress,
          city: findAddress.city,
          district: findAddress.district,
          state: findAddress.state,
          pincode: findAddress.pincode,
        },
        totalAmount: finalProductTotal,
        coupon: couponDetails,
        orderStatus: "Order Placed",
        paymentMethod: paymentMethod,
        paymentStatus: "Received",
      });

      const savedOrder = await newOrder.save();
      orderIds.push(savedOrder._id);

      // Update product stock after placing the order
      await Products.updateOne(
        { _id: item.productId._id, "sizes.size": item.size },
        { $inc: { "sizes.$.quantity": -item.quantity } }
      );
    }

    // console.log("product recucred");

    await Cart.findOneAndUpdate(
      { userId: userId },
      { $set: { cartProducts: [] } }
    );

    res.json({ message: "Orders placed successfully", orderIds: orderIds });
  } catch (error) {
    console.error("Error in placing order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const walletPay = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { addressId, paymentMethod, appliedCouponCode } = req.body;

    // Find user, cart, address, and wallet details
    const findUser = await User.findById(userId);
    const findCart = await Cart.findOne({ userId: userId }).populate(
      "cartProducts.productId"
    );
    const findAddress = await Address.findById(addressId);
    const wallet = await Wallet.findOne({ userId: userId });

    if (!findUser || !findCart || !findAddress || !wallet) {
      return res.status(400).json({
        success: false,
        message: "Invalid user, cart, address, or wallet",
      });
    }

    // Calculate total amount from cart
    let totalAmount = findCart.cartProducts.reduce((acc, item) => {
      const productPrice =
        item.productId.offerPrice || item.productId.realPrice;
      return acc + productPrice * item.quantity;
    }, 0);

    // Check wallet balance
    if (wallet.balance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    let couponDetails = {};
    let discountAmount = 0;

    // if coupon is added
    if (appliedCouponCode) {
      const coupon = await Coupon.findOne({
        couponCode: appliedCouponCode,
        isActive: true,
        expiryDate: { $gte: Date.now() },
      });

      if (coupon) {
        if (totalAmount >= coupon.minimumPurchase) {
          discountAmount = (totalAmount * coupon.discountInPercentage) / 100;
          couponDetails = {
            couponCode: coupon.couponCode,
            discountAmount: discountAmount.toFixed(2),
          };

          // coupon redeem update
          coupon.redeemedUsers.push({
            userId: userId,
            usedTime: new Date(),
          });
          coupon.timesUsed++;
          await coupon.save();
        } else {
          return res.json({
            message: `Minimum purchase of ₹${coupon.minimumPurchase} required to use this coupon`,
          });
        }
      } else {
        return res.json({ message: "Invalid or expired coupon" });
      }
    }

    // Final amount after the coupon apply
    const finalAmount = totalAmount - discountAmount;

    function generateOrderId() {
      const timeAndDate = Date.now().toString();
      const randomChars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let orderId = "OID";
      while (orderId.length < 13) {
        const randomIndex = Math.floor(Math.random() * randomChars.length);
        orderId += randomChars.charAt(randomIndex);
      }
      return orderId + timeAndDate;
    }

    const orderIds = [];

    // Create orders for each product in the cart
    for (let item of findCart.cartProducts) {
      const product = item.productId;
      const productPrice = product.offerPrice
        ? product.offerPrice
        : product.realPrice;
      const productTotal = productPrice * item.quantity;
      const productDiscount = appliedCouponCode
        ? (productTotal / totalAmount) * discountAmount
        : 0;
      const finalProductTotal = productTotal - productDiscount;

      const newOrderId = generateOrderId();

      // Create the order
      const newOrder = new Order({
        userId: userId,
        orderId: newOrderId,
        products: [
          {
            productId: product._id,
            quantity: item.quantity,
            size: item.size,
          },
        ],
        address: {
          addressName: findAddress.name,
          mobile: findAddress.mobile,
          homeAddress: findAddress.homeAddress,
          city: findAddress.city,
          district: findAddress.district,
          state: findAddress.state,
          pincode: findAddress.pincode,
        },
        totalAmount: finalProductTotal,
        coupon: couponDetails,
        orderStatus: "Order Placed",
        paymentStatus: "Received",
        paymentMethod: paymentMethod,
      });

      // Save the order
      const savedOrder = await newOrder.save();
      orderIds.push(savedOrder._id);

      // Amount reduceing from wallet
      wallet.balance -= finalProductTotal;
      wallet.history.push({
        amount: finalProductTotal,
        status: "Debit",
        transactionDate: new Date(),
      });
      await wallet.save();

      // update stock
      await Products.updateOne(
        { _id: product._id, "sizes.size": item.size },
        { $inc: { "sizes.$.quantity": -item.quantity } }
      );
    }

    // clear the cart after the order
    await Cart.findOneAndUpdate({ userId: userId }, { cartProducts: [] });

    return res.json({
      success: true,
      message: "Order placed successfully and wallet amount deducted",
      orderIds,
    });
  } catch (error) {
    // console.log("Error processing order:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error processing order" });
  }
};

//  Razorpay keys from env
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

// Initialize Razorpay instance
const instance = new Razorpay({
  key_id: RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET_KEY,
});

const onlinepay = async (req, res) => {
  try {
    // console.log("Hit the online pay");
    const {
      addressId,
      paymentMethod,
      paymentStatus,
      paymentId,
      appliedCouponCode,
      initial,
    } = req.body;
    // console.log("body ----->", req.body);

    const userId = req.session.userData;

    // Find user, cart, and address details
    const findUser = await User.findById(userId);
    const findCart = await Cart.findOne({ userId: userId }).populate(
      "cartProducts.productId"
    );
    const findAddress = await Address.findById(addressId);

    if (!findUser || !findCart || !findAddress) {
      return res
        .status(400)
        .json({ message: "Invalid user, cart, or address" });
    }

    if (!findCart.cartProducts || findCart.cartProducts.length === 0) {
      return res.status(400).json({ message: "No products in the cart" });
    }

    let couponDetails = {};
    let discountAmount = 0;

    // Calculate total amount
    let totalAmount = findCart.cartProducts.reduce((acc, item) => {
      const productPrice = item.productId.offerPrice
        ? item.productId.offerPrice
        : item.productId.realPrice;
      return acc + productPrice * item.quantity;
    }, 0);

    // console.log("Total Amount:", totalAmount);

    // Handle coupon if provided
    if (appliedCouponCode) {
      const coupon = await Coupon.findOne({
        couponCode: appliedCouponCode,
        expiryDate: { $gte: Date.now() },
      });

      if (coupon) {
        // console.log("Coupon:", coupon);
        if (totalAmount >= coupon.minimumPurchase) {
          discountAmount = (totalAmount * coupon.discountInPercentage) / 100;
          couponDetails = {
            couponCode: coupon.couponCode,
            discountAmount: discountAmount.toFixed(2),
          };
          coupon.redeemedUsers.push({
            userId: userId,
            usedTime: new Date(),
          });
          coupon.timesUsed++;
          await coupon.save();
        } else {
          return res.json({
            message: `Minimum purchase of ₹${coupon.minimumPurchase} required to use this coupon`,
          });
        }
      } else {
        return res.json({ message: "Invalid or expired coupon" });
      }
    }

    // Final amount after applying discount
    const finalAmount = totalAmount - discountAmount;

    if (initial) {
      // Generate Razorpay order
      const onlineOrder = await instance.orders.create({
        amount: finalAmount * 100,
        currency: "INR",
      });

      return res.json({
        message: "Payment initiated, awaiting payment confirmation",
        orderId: onlineOrder.id,
        amount: onlineOrder.amount,
      });
    }

    // Handle Failed payment status
    if (paymentStatus === "Failed") {
      // console.log("entered to failed payment if");
      const orderIds = [];
      const productIdsToRemove = [];

      // Generate order ID
      function generateOrderId() {
        // console.log("called generateOrderId");

        const timeAndDate = Date.now().toString();
        const randomChars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let orderId = "OID";
        while (orderId.length < 13) {
          const randomIndex = Math.floor(Math.random() * randomChars.length);
          orderId += randomChars.charAt(randomIndex);
        }
        return orderId + timeAndDate;
      }

      // console.log("user cart -->", findCart);

      // Create orders with pending status for each product in the cart
      for (let item of findCart.cartProducts) {
        const product = item.productId;
        const productPrice = product.offerPrice
          ? product.offerPrice
          : product.realPrice;
        const productTotal = productPrice * item.quantity;

        const productDiscount = appliedCouponCode
          ? (productTotal / totalAmount) * discountAmount
          : 0;
        const finalProductTotal = productTotal - productDiscount;

        const newOrderId = generateOrderId();

        // Create the order
        const newOrder = new Order({
          userId: userId,
          orderId: newOrderId,
          products: [
            {
              productId: product._id,
              quantity: item.quantity,
              size: item.size,
            },
          ],
          address: {
            addressName: findAddress.name,
            mobile: findAddress.mobile,
            homeAddress: findAddress.homeAddress,
            city: findAddress.city,
            district: findAddress.district,
            state: findAddress.state,
            pincode: findAddress.pincode,
          },
          totalAmount: finalProductTotal,
          coupon: couponDetails,
          paymentMethod: paymentMethod,
          orderStatus: "Pending",
          paymentStatus: "Failed",
        });
        // console.log("new order ---------->", newOrder);

        const savedOrder = await newOrder.save();
        orderIds.push(savedOrder._id);

        // id for removal from cart
        productIdsToRemove.push(item._id);
      }

      // Remove ordered items
      await Cart.updateOne(
        { userId: userId },
        { $pull: { cartProducts: { _id: { $in: productIdsToRemove } } } }
      );

      return res.json({
        message: "Order created with pending status, items removed from cart",
        orderIds,
      });
    }

    // Order after payment success
    if (paymentStatus === "Received" && paymentId) {
      const orderIds = [];

      // Generate order ID
      function generateOrderId() {
        const timeAndDate = Date.now().toString();
        const randomChars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let orderId = "OID";
        while (orderId.length < 13) {
          const randomIndex = Math.floor(Math.random() * randomChars.length);
          orderId += randomChars.charAt(randomIndex);
        }
        return orderId + timeAndDate;
      }

      // Create orders for each product in the cart after successful payment
      for (let item of findCart.cartProducts) {
        const product = item.productId;
        const productPrice = product.offerPrice
          ? product.offerPrice
          : product.realPrice;
        const productTotal = productPrice * item.quantity;

        const productDiscount = appliedCouponCode
          ? (productTotal / totalAmount) * discountAmount
          : 0;
        const finalProductTotal = productTotal - productDiscount;

        const newOrderId = generateOrderId();

        // Create the order
        const newOrder = new Order({
          userId: userId,
          orderId: newOrderId,
          products: [
            {
              productId: product._id,
              quantity: item.quantity,
              size: item.size,
            },
          ],
          address: {
            addressName: findAddress.name,
            mobile: findAddress.mobile,
            homeAddress: findAddress.homeAddress,
            city: findAddress.city,
            district: findAddress.district,
            state: findAddress.state,
            pincode: findAddress.pincode,
          },
          totalAmount: finalProductTotal,
          coupon: couponDetails,
          paymentMethod: paymentMethod,
          orderStatus: "Order Placed",
          paymentStatus: "Received",
        });

        // Save the order and update stock
        const savedOrder = await newOrder.save();
        orderIds.push(savedOrder._id);

        await Products.updateOne(
          {
            _id: product._id,
            "sizes.size": item.size,
          },
          { $inc: { "sizes.$.quantity": -item.quantity } }
        );

        // console.log(
        //   `Stock updated for product: ${product.productName}, Size: ${item.size}`
        // );
      }

      // Clear the cart after the order is created
      await Cart.findOneAndUpdate(
        { userId: userId },
        { $set: { cartProducts: [] } }
      );
      // console.log("Cart cleared after successful payment and order creation.");

      return res.json({
        message: "Order created successfully after payment",
        orderIds,
      });
    }
  } catch (error) {
    // console.log(
    //   "Error in online payment processing------------------->:",
    //   error
    // );
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const rePayment = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { orderId, paymentId } = req.body;

    const findOrder = await Order.findById(orderId).populate("items.productId"); 
    if (!findOrder) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const totalAmount = findOrder.totalAmount;

    if (!paymentId) {
      //  Razorpay order if paymentId is not provided
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
      //  update order status to "Order Placed"
      findOrder.paymentId = paymentId;
      findOrder.orderStatus = "Order Placed";
      findOrder.paymentStatus = "Received";

      //  update product stock by size

      for (const item of findOrder.items) {
        const product = item.productId;
        if (!product) continue;

        const result = await Products.updateOne(
          {
            _id: product._id,
            "sizes.size": item.size,
          },
          { $inc: { "sizes.$.quantity": -item.quantity } }
        );

        // Check if stock  updated
        if (!result.modifiedCount) {
          console.warn(
            `Stock update failed for product: ${product.productName}, Size: ${item.size}`
          );
        } else {
          console.log(
            `Stock updated for product: ${product.productName}, Size: ${item.size}`
          );
        }
      }
      await findOrder.save();

      return res.json({
        success: true,
        message:
          "Payment successful, order status updated to 'Order Placed', and stock adjusted",
      });
    }
  } catch (error) {
    console.error("Error in rePayment:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { paymentId, orderId, paymentStatus, couponCode } = req.body;
    const userId = req.session.userData;

    // if (couponCode) {
    //   const coupon = await Coupon.findOne({ couponCode: couponCode });
    //   if (coupon) {
    //     coupon.redeemedUsers.push({ userId: userId, usedTime: new Date() });
    //     coupon.timesUsed++;
    //     await coupon.save();
    //   }
    // }

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

    // console.log(req.body, "this is form cancel body");

    const findOrder = await Order.findById(orderId);
    if (!findOrder) {
      console.error("Order not found with ID:", orderId);
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    // console.log("Order Details:", findOrder);

    const { paymentMethod, orderStatus, paymentStatus, products, totalAmount } =
      findOrder;

    if (products.length === 0) {
      console.error("No products found in the order:", orderId);
      return res.status(400).json({
        message: "No products found in this order.",
      });
    }

    const {
      productId: orderProductData,
      quantity: productQ,
      size,
    } = products[0];
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

    // console.log("Action Type:", actionType);
    // console.log("Payment Method:", paymentMethod);
    // console.log("Order Status:", orderStatus);
    // console.log("Payment Status:", paymentStatus);

    if (
      actionType === "cancel" &&
      (paymentMethod === "Online" ||
        paymentMethod === "COD" ||
        paymentMethod === "Wallet") &&
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

      // Refund
      let wallet = await Wallet.findOne({ userId });
      const orderAmount = totalAmount || 0;
      if (!wallet) {
        // no wallet, create a new one
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
        message:
          "Your order has been canceled successfully and your wallet has been refunded.",
        orderStatus: "Cancelled",
      });
    } else {
      console.error(
        "Order cannot be processed for cancellation. Check conditions."
      );
      return res.status(400).json({
        message: "Order cannot be canceled under the current conditions.",
      });
    }
  } catch (error) {
    console.error("Error during cancellation process:", error);
    return res.status(500).json({
      message:
        "An error occurred during the cancellation process. Please try again later.",
    });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { returnReason, orderId } = req.body;
    // console.log("This data from return order", req.body);
    const userId = req.session.userData;

    // Validate return reason
    if (!returnReason) {
      return res.status(400).json({
        message: "Return reason is required.",
        success: false,
      });
    }

    // Verify the orderId is valid and the order exists
    const findOrder = await Order.findById(orderId);
    if (!findOrder) {
      return res.status(404).json({
        message: "Order not found",
        success: false,
      });
    }

    const { paymentMethod, orderStatus, paymentStatus, products, totalAmount } =
      findOrder;

    // Check if the order is eligible for return
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

    const {
      productId: orderProductData,
      quantity: productQ,
      size,
    } = products[0];
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

    // console.log("Updating order status to 'Returned'...");

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
      message:
        "Your order has been returned successfully and your wallet has been refunded.",
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

    // order with product details
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

    // allow file download
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
  codPlaceOrder,
  successOrder,
  onlinepay,
  rePayment,
  updateOrderStatus,
  applyCoupon,
  removeCoupon,
  walletPay,
  cancelation,
  returnOrder,
  getInvoice,
  invoiceDownload,
};
