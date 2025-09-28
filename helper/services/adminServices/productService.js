const Products = require("../../../Model/productModel");
const Category = require("../../../Model/categoryModel");
const Offer = require("../../../Model/OfferModel");
const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");

// Helper function to get full image path for file operations
const getFullImagePath = (imagePath) => {
  if (!imagePath) return null;
  
  // Normalize path separators
  const normalized = imagePath.replace(/\\/g, "/");
  
  // Remove leading slash if present
  const cleanPath = normalized.startsWith("/") ? normalized.substring(1) : normalized;
  
  // If it doesn't start with Uploads/, add it
  const finalPath = cleanPath.startsWith("Uploads/") ? cleanPath : `Uploads/${cleanPath}`;
  
  // Return full filesystem path
  return path.join(__dirname, "../../../helper/public", finalPath);
};

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
  if (!offerPercentage || offerPercentage === 0) {
    return realPrice;
  }
  if (offerPercentage > 0) {
    const discountAmount = realPrice * (offerPercentage / 100);
    return Math.round(realPrice - discountAmount);
  }
  return realPrice;
};

const createProduct = async (productData, sizes, images, offerId) => {
  let offerPrice = null;
  
  if (offerId && offerId !== 'none') {
    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }
    offerPrice = calculateOfferPrice(productData.realPrice, offer.offerPercentage);
  }

  const product = new Products({
    productName: productData.productName,
    description: productData.description,
    sizes,
    realPrice: productData.realPrice,
    brandName: productData.brandName,
    images,
    offerId: offerId && offerId !== 'none' ? new mongoose.Types.ObjectId(offerId) : null,
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

  let offerPrice = null;
  
  if (productData.offerId && productData.offerId !== 'none') {
    const offer = await Offer.findById(productData.offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }
    offerPrice = calculateOfferPrice(productData.realPrice, offer.offerPercentage);
  }

  // Update all fields
  existingProduct.productName = productData.productName;
  existingProduct.description = productData.description;
  existingProduct.realPrice = productData.realPrice;
  existingProduct.brandName = productData.brandName;
  existingProduct.categoryId = productData.category;
  existingProduct.sizes = sizes;
  existingProduct.images = images;
  existingProduct.offerId = productData.offerId && productData.offerId !== 'none' ? productData.offerId : null;
  existingProduct.offerPrice = offerPrice;

  return await existingProduct.save();
};

const toggleProductStatus = async (productId, isActive) => {
  return await Products.findByIdAndUpdate(
    productId, 
    { is_active: isActive }, 
    { new: true }
  );
};

const deleteProductById = async (productId) => {
  const product = await Products.findById(productId);
  if (!product) {
    return null;
  }

  // Delete associated image files
  if (product.images && product.images.length > 0) {
    for (const imagePath of product.images) {
      try {
        const fullPath = getFullImagePath(imagePath);
        await fs.unlink(fullPath);
        console.log(`Deleted image file: ${fullPath}`);
      } catch (fileError) {
        console.warn(`Could not delete image file: ${imagePath}`, fileError.message);
      }
    }
  }

  // Delete the product
  await Products.findByIdAndDelete(productId);
  return true;
};

const removeProductImage = async (productId, imageIndex) => {
  try {
    console.log(`Removing image at index ${imageIndex} from product ${productId}`);
    
    const product = await Products.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.images || imageIndex < 0 || imageIndex >= product.images.length) {
      throw new Error("Invalid image index");
    }

    const imageToRemove = product.images[imageIndex];
    console.log(`Image to remove: ${imageToRemove}`);

    // Try to delete the physical file
    try {
      const fullPath = getFullImagePath(imageToRemove);
      console.log(`Attempting to delete file at: ${fullPath}`);
      
      // Check if file exists first
      await fs.access(fullPath);
      // Delete the file
      await fs.unlink(fullPath);
      console.log(`Successfully deleted image file: ${fullPath}`);
    } catch (fileError) {
      console.warn(`Could not delete image file: ${imageToRemove}`, fileError.message);
      // Continue with database update even if file deletion fails
    }

    // Remove from database array
    product.images.splice(imageIndex, 1);
    const savedProduct = await product.save();

    console.log(`Successfully removed image from database. Remaining images: ${savedProduct.images.length}`);
    
    return {
      success: true,
      message: "Image removed successfully",
      remainingImages: savedProduct.images.length
    };

  } catch (error) {
    console.error(`Error in removeProductImage:`, error);
    throw error;
  }
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