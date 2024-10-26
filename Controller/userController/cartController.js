const User = require("../../Model/userModel");
const Category = require("../../Model/categoryModel");
const Products = require("../../Model/productModel");
const Cart = require("../../Model/cartModel");
const Order = require("../../Model/orderModel");
const Wishlist = require("../../Model/wishlistModel");
const bcrypt = require("bcrypt");
const Address = require("../../Model/addressModel");
const nodemailer = require("nodemailer");
const session = require("express-session");
const { json } = require("body-parser");

const loadCart = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const cartData = await Cart.findOne({ userId }).populate(
      "cartProducts.productId"
    );
    res.render("shoppingCart", { cartData, findUser });
  } catch (error) {
    console.error("Error loading cart:", error);
    res.status(500).send("Error loading cart");
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, sizeId, totalAmount } = req.body;

    // console.log("Data From Body", req.body);

    //find the product
    const findSQ = await Products.findById(productId);
    const userId = req.session.userData;

    // console.log("Find SQ",findSQ)

    if (!findSQ) {
      return res.json({ success: false, message: "Cannot find product" });
    }

    //========Check both Size id is are equal======

    let currentSize = findSQ.sizes.find((obj) => obj._id.toString() === sizeId);

    console.log("current sizess", currentSize);

    if (!currentSize || currentSize.quantity <= 0) {
      return res.json({
        success: false,
        message: "Product size is out of stock",
      });
    }
    //====checking already in the cart otherwise create new cartitems==
    const existingCart = await Cart.findOne({ userId });

    let cartProduct = existingCart?.cartProducts.find(
      (item) =>
        item.productId.toString() === productId &&
        item.size === currentSize.size
    );
    //already in the cart add quantity

    if (cartProduct) {
      if (cartProduct.quantity + 1 > currentSize.quantity) {
        return res.json({
          success: false,
          message: "Cannot add more, product size stock exceeded",
        });
      }
      cartProduct.quantity += 1;
      await existingCart.save();
    } else {
      const newProduct = {
        productId,
        size: currentSize.size,
        quantity: 1,
      };

      // console.log("Cartproducts",cartProduct)

      if (existingCart) {
        existingCart.cartProducts.push(newProduct);
        await existingCart.save();
      } else {
        const cartItems = new Cart({
          userId,
          cartProducts: [newProduct],
        });
        await cartItems.save();
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    return res.send("cart error");
  }
};

const updateCart = async (req, res) => {
  try {
    const { productId, sizeId, quantity, totalAmount } = req.body;
    console.log("Request Body:", req.body);

    const userId = req.session.userData;

    const product = await Products.findById(productId);
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    const sizeInfo = product.sizes.find((s) => s.size === sizeId.toString());
    if (!sizeInfo) {
      return res.json({ success: false, message: "Size not found" });
    }

    if (quantity > sizeInfo.quantity) {
      return res.json({ success: false, message: "Stock not available" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    const cartProduct = cart.cartProducts.find(
      (item) =>
        item.productId.toString() === productId && item.size === sizeInfo.size
    );
    if (!cartProduct) {
      return res.json({ success: false, message: "Item not found in cart" });
    }

    // Update the quantity
    cartProduct.quantity = quantity;
    await cart.save();

    console.log("Cart", cart);

    return res.json({
      success: true,
      message: "Cart updated successfully",
      totalAmount: totalAmount,
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    return res.json({ success: false, message: "Failed to update cart" });
  }
};

const deleteItemInCart = async (req, res) => {
  try {
    const { id } = req.body;
    // console.log('req.body', req.body);

    const userId = req.session.userData;

    if (!id) {
      return res.json({ success: false, message: "ID is required" });
    }

    const cart = await Cart.findOneAndUpdate(
      { userId: userId },
      { $pull: { cartProducts: { _id: id } } }
    );

    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    return res.json({
      success: true,
      message: "Cart item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting item from cart:", error);
    return res.json({
      success: false,
      message: "An error occurred while deleting the item from the cart",
    });
  }
};

const loadWishlist = async (req, res) => {
  try {
      const userId = req.session.userData; 
      if (!userId) {
          return res.json({ success: false, message: "User not authenticated" });
      }

      const findUser = await User.findById(userId);
      const wishlistData = await Wishlist.findOne({ userId })
          .populate("wishlistProducts.productId");

      let userWishlist = [];
      if (wishlistData && wishlistData.wishlistProducts) {
          userWishlist = wishlistData.wishlistProducts.map(p => p.productId._id.toString());
      }

     
      res.render("wishlist", {
          wishlistData,
          findUser,
          userWishlist 
      });
  } catch (error) {
      console.log(error);
      res.json({ success: false, message: "Internal Server Error" });
  }
};


const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.userData;

    if (!userId) {
      return res.json({ success: false, message: "User not authenticated" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, wishlistProducts: [] });
    }

    const productIndex = wishlist.wishlistProducts.findIndex(
      (p) => p.productId.toString() === productId
    );

    if (productIndex > -1) {
      // Remove product from wishlist
      wishlist.wishlistProducts.splice(productIndex, 1);
      await wishlist.save();
      return res.json({
        success: true,
        message: "Product removed from wishlist",
        action: "removed",
      });
    } else {
      // Add product to wishlist
      wishlist.wishlistProducts.push({ productId });
      await wishlist.save();
      return res.json({
        success: true,
        message: "Product added to wishlist",
        action: "added",
      });
    }
  } catch (error) {
    console.error("Server Error:", error);
    return res.json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  addToCart,
  loadCart,
  updateCart,
  deleteItemInCart,
  loadWishlist,
  addToWishlist,
};
