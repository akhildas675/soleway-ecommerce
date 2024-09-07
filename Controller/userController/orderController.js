const User = require("../../Model/userModel");
const Category = require("../../Model/categoryModel");
const Products = require("../../Model/productModel");
const Cart = require("../../Model/cartModel");
const Order = require("../../Model/orderModel");
const bcrypt = require("bcrypt");
const Address = require("../../Model/addressModel");
const nodemailer = require("nodemailer");
const session = require("express-session");
// const { checkout } = require("../../routes/userRoutes");
const { json } = require("body-parser");
const razorpay = require('razorpay');
const Razorpay = require("razorpay");
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;




const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const findCartItems = await Cart.findOne({ userId }).populate(
      "cartProducts.productId"
    );
    const findAddress = await Address.find({ userId });
    res.render("checkout", {
      findUser,
      findCartItems,
      findAddress,
    });
  } catch (error) {
    console.log(error);
  }
};

const codPlaceOrder = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { addressId, paymentMethod,totalAmount } = req.body;
    const findUser = await User.findById(userId);
    const findCart = await Cart.find({ userId: userId }).populate(
      "cartProducts.productId"
    );
    const findAddress = await Address.findById(addressId);
    if (!findUser || !findCart || !findAddress) {
      return res.json({ message: "Invalid user, cart, or address" });
    }
    // let totalAmount = 0;
    for (let item of findCart[0].cartProducts) {
      const selectedSize = item.productId.sizes.find(
        (size) => size.size === item.size
      );
      if (!selectedSize || selectedSize.quantity < item.quantity) {
        return res.json({
          message: `Not enough stock for ${item.productId.productName} in size ${item.size}`,
        });
      }
      // totalAmount += item.quantity * item.productId.realPrice;
      //
      // selectedSize.quantity -= item.quantity;
    }



    const newOrder = new Order({
      userId: userId,
      products: findCart[0].cartProducts.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        size: item.size,
      })),
      address: {
        addressName: findAddress.name,
        mobile: findAddress.mobile,
        homeAddress: findAddress.homeAddress,
        city: findAddress.city,
        district: findAddress.district,
        state: findAddress.state,
        pincode: findAddress.pincode,
      },
      totalAmount: totalAmount,
      orderStatus:"Order Placed",
      paymentMethod: paymentMethod,
      
    });
    const savedOrder = await newOrder.save();

    //finding the ordered products
    const orderedProducts = findCart[0].cartProducts.map((product) => ({
      productId: product.productId._id,
      size: product.size,
      quantity: product.quantity,
    }));

    //product updating after order
    for (let i = 0; i < orderedProducts.length; i++) {
      await Products.updateOne(
        {
          _id: orderedProducts[i].productId,
          "sizes.size": orderedProducts[i].size,
        },
        { $inc: { "sizes.$.quantity": -orderedProducts[i].quantity } }
      );
    }
    // then make it cart is empty
    await Cart.updateOne(
      { userId: userId },
      {
        cartProducts: [],
      }
    );

    res.json({ message: "Order placed successfully", orderId: savedOrder._id });
  } catch (error) {
    console.error(error);
    res.json({ message: "Internal Server Error" });
  }
};




let instance= new Razorpay({
  key_id:RAZORPAY_ID_KEY,
  key_secret:RAZORPAY_SECRET_KEY,

})
const onlinepay = async (req, res) => {
  try {
    const { addressId, paymentMethod, totalAmount } = req.body;
    const userId = req.session.userData;

    // Find user, cart, and address
    const findUser = await User.findById(userId);
    const findCart = await Cart.findOne({ userId: userId }).populate("cartProducts.productId");
    const findAddress = await Address.findById(addressId);

    // Validate user, cart, and address
    if (!findUser) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!findCart || !findCart.cartProducts || findCart.cartProducts.length === 0) {
      return res.status(400).json({ message: "Cart is empty or not found" });
    }

    if (!findAddress) {
      return res.status(400).json({ message: "Address not found" });
    }

    // Check product stock
    for (let item of findCart.cartProducts) {
      const selectedSize = item.productId.sizes.find((size) => size.size === item.size);

      if (!selectedSize || selectedSize.quantity < item.quantity) {
        return res.status(400).json({
          message: `Not enough stock for ${item.productId.productName} in size ${item.size}`,
        });
      }

      // selectedSize.quantity -= item.quantity;
    }

    // Create new order
    const newOrder = new Order({
      userId: userId,
      products: findCart.cartProducts.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
        size: item.size,
      })),
      address: {
        addressName: findAddress.name,
        mobile: findAddress.mobile,
        homeAddress: findAddress.homeAddress,
        city: findAddress.city,
        district: findAddress.district,
        state: findAddress.state,
        pincode: findAddress.pincode,
      },
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      orderStatus: "Pending",
      paymentStatus:"Pending"
    });

    const saveOrder = await newOrder.save();
    const amounts = totalAmount * 100; // Convert to paise for Razorpay

    // Create a Razorpay order
    const onlineOrder = await instance.orders.create({
      amount: amounts,
      currency: "INR",
      receipt: saveOrder._id.toString(),
    });

    // Process the products after placing the order
    const orderedProducts = findCart.cartProducts.map((product) => ({
      productId: product.productId._id,
      size: product.size,
      quantity: product.quantity,
    }));

  
    for (let i = 0; i < orderedProducts.length; i++) {
      await Products.updateOne(
        {
          _id: orderedProducts[i].productId,
          "sizes.size": orderedProducts[i].size,
        },
        { $inc: { "sizes.$.quantity": -orderedProducts[i].quantity } }
      );
    }


    await Cart.updateOne(
      { userId: userId },
      {
        cartProducts: [],
      }
    );
    

  
    res.json({
      message: "Order created, awaiting payment",
      orderId: saveOrder._id,
      onlineOrder,
    });

  } catch (error) {
    console.log("Error in online payment processing:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateOrderStatus= async(req,res)=>{
  try {
    const {paymentId,orderId,paymentStatus}=req.body
    console.log("update status from frontend",req.body)

    const updateOrder=await Order.findByIdAndUpdate(orderId,{paymentStatus:paymentStatus,paymentId:paymentId,orderStatus:"Order Placed"});

    res.json({ message: "Order status updated successfully", paymentStatus: paymentStatus });


  } catch (error) {
    console.log(error)
  }
}



const successOrder = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    res.render("orderSuccess", { findUser });
  } catch (error) {
    console.log(error);
  }
};




module.exports = {
  loadCheckout,
  codPlaceOrder,
  successOrder,
  onlinepay,
  updateOrderStatus,
};
