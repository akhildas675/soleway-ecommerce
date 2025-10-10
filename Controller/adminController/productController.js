const Products = require("../../Model/productModel");
const Category = require("../../Model/categoryModel");
const Offer = require("../../Model/OfferModel"); // Fixed import path
const mongoose = require("mongoose");

// import services and utilities
const { processImages, updateProductImages } = require("../../helper/utils/adminUtils/imageUtils");
const { validateProductData, validateSizes, validateOfferData } = require("../../helper/utils/adminUtils/productValidationUtils");
const {
  getPaginatedProducts,
  getProductFormData,
  getProductById,
  createProduct,
  updateProductById,
  toggleProductStatus,
  deleteProductById,
  removeProductImage
} = require("../../helper/services/adminServices/productService");
const {
  getAllOffers,
  getOfferById,
  createOffer,
  updateOfferById,
  deleteOfferById
} = require("../../helper/services/adminServices/offerService");

// Product management controls
const productPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const { productData, totalPages } = await getPaginatedProducts(page);

    res.render("productsList", {
      products: productData,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error("Error in productPage:", error);
    res.status(500).send("Server Error");
  }
};

const addProduct = async (req, res) => {
  try {
    const { categories, offers } = await getProductFormData();
    res.render("addProduct", { categories, offer: offers });
  } catch (error) {
    console.error("Error in addProduct:", error);
    res.status(500).send("Server Error");
  }
};

const productVerify = async (req, res) => {
  try {
    const productErrors = validateProductData(req.body);
    if (productErrors.length > 0) {
      return res.status(400).json({ errors: productErrors });
    }

    const { sizes, errors: sizeErrors } = validateSizes(req.body);
    if (sizeErrors.length > 0) {
      return res.status(400).json({ errors: sizeErrors });
    }

    // Process images
    const imageResult = await processImages(req.files);
    if (!imageResult.success) {
      return res.status(400).json({ errors: imageResult.errors });
    }

    // Create product
    const productData = await createProduct(req.body, sizes, imageResult.images, req.body.offerId);

    if (productData) {
      return res.status(201).json({ message: "Product added successfully" });
    } else {
      return res.status(500).json({ message: "Error adding product" });
    }
  } catch (error) {
    console.error("Error in productVerify:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const editProductPage = async (req, res) => {
  try {
    const productId = req.query.id;
    
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).send("Invalid product ID");
    }

    const [product, { categories, offers }] = await Promise.all([
      getProductById(productId),
      getProductFormData()
    ]);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Normalize image paths for frontend display
    if (product.images && product.images.length > 0) {
      product.images = product.images.map(imagePath => {
        // Ensure proper URL format for frontend
        let normalizedPath = imagePath.replace(/\\/g, "/");
        
        if (normalizedPath.startsWith('/')) {
          return normalizedPath;
        } else if (normalizedPath.startsWith('Uploads/')) {
          return `/${normalizedPath}`;
        } else {
          return `/Uploads/${normalizedPath}`;
        }
      });
    }

    req.session.editProductId = product._id;
    
    res.render("editProduct", {
      categories,
      products: product,
      offer: offers,
    });
  } catch (error) {
    console.error("Error in editProductPage:", error);
    res.status(500).send("Server Error");
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.query.productId;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    // Get existing product
    const existingProduct = await getProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // console.log(`Updating product ${productId}...`);
    // console.log(`Existing images count: ${existingProduct.images?.length || 0}`);
    // console.log(`New files count: ${req.files?.length || 0}`);

    // Parse and validate sizes
    const sizes = [];
    const bodyKeys = Object.keys(req.body);
    
    for (const key of bodyKeys) {
      if (key.includes("size") && req.body[key]) {
        const sizeNumber = parseInt(key.replace("size", ""));
        const quantityKey = `quantity${sizeNumber}`;
        const quantityValue = parseInt(req.body[quantityKey]);

        if (!isNaN(sizeNumber) && !isNaN(quantityValue) && quantityValue >= 0) {
          sizes.push({ size: sizeNumber, quantity: quantityValue });
        }
      }
    }

    // Handle image updates
    let finalImages = [...(existingProduct.images || [])];

    // If new images are uploaded, process them
    if (req.files && req.files.length > 0) {
      // console.log(`Processing ${req.files.length} new images...`);
      
      const imageResult = await updateProductImages(
        req.files, 
        existingProduct.images || []
      );

      if (!imageResult.success) {
        console.error("Image processing failed:", imageResult.errors);
        return res.status(400).json({ 
          error: "Failed to process images",
          details: imageResult.errors 
        });
      }

      finalImages = imageResult.images;
      // console.log(`Successfully processed images. Total count: ${finalImages.length}`);
    }

    // Validate minimum image requirement
    if (finalImages.length < 5) {
      return res.status(400).json({ 
        error: "Product must have at least 5 images",
        details: [`Current image count: ${finalImages.length}. Please add more images.`]
      });
    }

    // Update product in database
    const updatedProduct = await updateProductById(
      productId, 
      req.body, 
      sizes, 
      finalImages
    );

    // console.log(`Product ${productId} updated successfully`);

    // Send success response
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({ 
        success: true, 
        message: "Product updated successfully",
        product: {
          id: updatedProduct._id,
          name: updatedProduct.productName,
          imageCount: updatedProduct.images?.length || 0
        }
      });
    } else {
      return res.redirect("/admin/productsView?update=success");
    }

  } catch (error) {
    console.error("Error updating product:", error);
    
    // Handle specific errors
    if (error.message === "Product not found") {
      return res.status(404).json({ error: "Product not found" });
    }
    
    if (error.message === "Offer not found") {
      return res.status(404).json({ error: "Offer not found" });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: "Validation failed",
        details: Object.values(error.errors).map(e => e.message)
      });
    }

    // Generic error response
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? "Failed to update product" 
      : error.message;

    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ error: errorMessage });
    } else {
      return res.redirect("/admin/productsView?error=update_failed");
    }
  }
};

const removeImageEditProduct = async (req, res) => {
  try {
    const { index, productId } = req.body;
    
    console.log(`Remove image request - ProductId: ${productId}, Index: ${index}`);

    // Validate inputs
    if (!productId || index === undefined || index === null) {
      return res.status(400).json({ 
        success: false, 
        message: "Product ID and image index are required" 
      });
    }

    // Validate product ID format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid product ID format" 
      });
    }

    // Convert index to number
    const imageIndex = parseInt(index);
    if (isNaN(imageIndex) || imageIndex < 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid image index" 
      });
    }

    // Call the service function
    const result = await removeProductImage(productId, imageIndex);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: result.message,
        remainingImages: result.remainingImages
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: result.message || "Failed to remove image" 
      });
    }

  } catch (error) {
    console.error("Error in removeImageEditProduct:", error);
    
    // Handle specific errors
    if (error.message === "Product not found") {
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }
    
    if (error.message === "Invalid image index") {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid image index" 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: "Failed to remove image. Please try again." 
    });
  }
};

const productBlocking = async (req, res) => {
  try {
    const productId = req.query.id;
    await toggleProductStatus(productId, false);
    res.redirect("/admin/productsView");
  } catch (error) {
    console.error("Error in productBlocking:", error);
    res.status(500).send("Error blocking product");
  }
};

const productUnblocking = async (req, res) => {
  try {
    const productId = req.query.id;
    await toggleProductStatus(productId, true);
    res.redirect("/admin/productsView");
  } catch (error) {
    console.error("Error in productUnblocking:", error);
    res.status(500).send("Error unblocking product");
  }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const result = await deleteProductById(productId);
    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Offer management
const loadOffer = async (req, res) => {
  try {
    const offers = await getAllOffers();
    res.render("offer", { offer: offers });
  } catch (error) {
    console.error("Error in loadOffer:", error);
    res.status(500).send("Server Error");
  }
};

const addOffer = async (req, res) => {
  try {
    const { offerName, offerPercentage } = req.body;
    const { errors, percentage } = validateOfferData(req.body);

    if (errors.length > 0) {
      return res.json({ success: false, errors });
    }

    await createOffer(offerName, percentage);

    return res.json({
      success: true,
      message: "Offer added successfully",
    });
  } catch (error) {
    console.error("Error adding offer:", error);
    
    if (error.message.includes("already exists")) {
      return res.json({
        success: false,
        errors: [error.message],
      });
    }
    
    return res.json({
      success: false,
      message: "Server error",
    });
  }
};

const loadEditOffer = async (req, res) => {
  try {
    const offer = await getOfferById(req.query.id);
    res.render("editOffer", { offer });
  } catch (error) {
    console.error("Error in loadEditOffer:", error);
    res.status(500).send("Server Error");
  }
};

const updateOffer = async (req, res) => {
  try {
    const { offerId, offerName, offerPercentage } = req.body;
    const { errors } = validateOfferData(req.body);

    if (errors.length > 0) {
      return res.json({ success: false, errors });
    }

    const updatedOffer = await updateOfferById(offerId, offerName, offerPercentage);

    res.json({
      success: true,
      message: "Offer updated successfully",
      offer: updatedOffer,
    });
  } catch (error) {
    console.error("Error updating offer:", error);
    
    if (error.message.includes("already exists")) {
      return res.json({
        success: false,
        message: error.message,
      });
    }
    
    if (error.message === "Offer not found") {
      return res.json({
        success: false,
        message: "Offer not found",
      });
    }
    
    res.json({
      success: false,
      message: "Error updating offer",
    });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const offerId = req.query.id;

    await deleteOfferById(offerId);
    res.json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    
    if (error.message === "Offer not found") {
      return res.json({ success: false, message: "Offer not found" });
    }
    
    res.json({ success: false, message: "Error deleting offer" });
  }
};

module.exports = {
 
  productPage,
  addProduct,
  productVerify,
  editProductPage,
  updateProduct,
  removeImageEditProduct,
  productBlocking,
  productUnblocking,
  deleteProduct,
  loadOffer,
  addOffer,
  loadEditOffer,
  updateOffer,
  deleteOffer,
};