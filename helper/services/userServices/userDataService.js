const User = require("../../../Model/userModel");
const Cart = require("../../../Model/cartModel");
const Wishlist = require("../../../Model/wishlistModel");

const getUserContext = async (userId) => {
  if (!userId) return { cartCount: 0, wishlistCount: 0, userWishlist: [] };

  const [cart, wishlist] = await Promise.all([
    Cart.findOne({ userId }, { cartProducts: 1 }),
    Wishlist.findOne({ userId }, { wishlistProducts: 1 })
  ]);

  const cartCount = cart ? cart.cartProducts.length : 0;
  const wishlistCount = wishlist ? wishlist.wishlistProducts.length : 0;
  const userWishlist = wishlist ? wishlist.wishlistProducts.map(p => p.productId.toString()) : [];

  return { cartCount, wishlistCount, userWishlist };
};

const getCommonPageData = async (userId) => {
  const [findUser, userContext] = await Promise.all([
    User.findById(userId),
    getUserContext(userId)
  ]);

  return { findUser, ...userContext };
};

module.exports = { getUserContext, getCommonPageData };