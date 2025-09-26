const Products = require("../../../Model/productModel");
const Category = require("../../../Model/categoryModel");
const Offer = require("../../../Model/OfferModel");
const mongoose = require("mongoose");

const getPaginatedProducts = async (page = 1, limit = 8) => {
  const skip = (page - 1) * limit;

  const [totalProducts, productData] = await Promise.all([
    Products.countDocuments(),
    Products.find()
      .populate("categoryId")
      .populate("offerId")
      .skip(skip)
      .limit(limit)
  ]);

  const totalPages = Math.ceil(totalProducts / limit);

  return { productData, totalPages, totalProducts };
};

const getProductFormData = async () => {
  const [categories, offers] = await Promise.all([
    Category.find(),
    Offer.find({ isActive: true })
  ]);

  return { categories, offers };
};

const getProductById = async (productId) => {
  return await Products.findById(productId);
};

const calculateOfferPrice = (realPrice, offerPercentage) => {
  if (offerPercentage === 0) {
    return realPrice;
  }

  if (offerPercentage > 0) {
    const discountAmount = realPrice * (offerPercentage / 100);
    return realPrice - discountAmount;
  }

  return realPrice;
};

const createProduct = async (productData, sizes, images, offerId) => {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    throw new Error("Offer not found");
  }

  const offerPrice = calculateOfferPrice(productData.realPrice, offer.offerPercentage);

  const product = new Products({
    productName: productData.productName,
    description: productData.description,
    sizes,
    realPrice: productData.realPrice,
    brandName: productData.brandName,
    images,
    offerId: new mongoose.Types.ObjectId(offerId),
    categoryId: new mongoose.Types.ObjectId(productData.category),
    offerPrice,
  });

  return await product.save();
};

const updateProductById = async (productId, productData, sizes, images) => {
  const existingProduct = await Products.findById(productId);
  if (!existingProduct) {
    throw new Error("Product not found");
  }

  const offer = await Offer.findById(productData.offerId);
  if (!offer) {
    throw new Error("Offer not found");
  }

  const offerPrice = calculateOfferPrice(productData.realPrice, offer.offerPercentage);

  existingProduct.productName = productData.productName;
  existingProduct.description = productData.description;
  existingProduct.realPrice = productData.realPrice;
  existingProduct.brandName = productData.brandName;
  existingProduct.categoryId = productData.category;
  existingProduct.sizes = sizes;
  existingProduct.images = images;
  existingProduct.offerId = productData.offerId;
  existingProduct.offerPrice = offerPrice;

  return await existingProduct.save();
};

const toggleProductStatus = async (productId, isActive) => {
  return await Products.findByIdAndUpdate(productId, { is_active: isActive });
};

const deleteProductById = async (productId) => {
  return await Products.findByIdAndDelete(productId);
};

const removeProductImage = async (productId, imageIndex) => {
  const product = await Products.findById(productId);

  if (!product || !product.images || imageIndex >= product.images.length) {
    throw new Error("Invalid product or image index");
  }

  product.images.splice(imageIndex, 1);
  return await product.save();
};

module.exports = {
  getPaginatedProducts,
  getProductFormData,
  getProductById,
  createProduct,
  updateProductById,
  toggleProductStatus,
  deleteProductById,
  removeProductImage,
  calculateOfferPrice
};