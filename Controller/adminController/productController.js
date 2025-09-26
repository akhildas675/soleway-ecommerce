const Products = require("../../Model/productModel");
const Category = require("../../Model/categoryModel");
const Offer = require("../../Model/orderModel");
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

//project management controls

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
    console.log(error);
    res.status(500).send("Server Error");
  }
};

const addProduct = async (req, res) => {
  try {
    const { categories, offers } = await getProductFormData();
    res.render("addProduct", { categories, offer: offers });
  } catch (error) {
    console.log(error);
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

    // process images
    const imageResult = await processImages(req.files);
    if (!imageResult.success) {
      return res.status(400).json({ errors: imageResult.errors });
    }

    // create product
    const productData = await createProduct(req.body, sizes, imageResult.images, req.body.offerId);

    if (productData) {
      return res.status(201).json({ message: "Product added successfully" });
    } else {
      return res.status(500).json({ message: "Error adding product" });
    }
  } catch (error) {
    console.log("Error", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const editProductPage = async (req, res) => {
  try {
    const [product, { categories, offers }] = await Promise.all([
      getProductById(req.query.id),
      getProductFormData()
    ]);

    req.session.editProductId = product;
    
    res.render("editProduct", {
      categories,
      products: product,
      offer: offers,
    });
  } catch (error) {
    console.log(error);
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.query.productId;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const existingProduct = await getProductById(productId);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // parse sizes from request
    const sizes = [];
    for (let i = 0; i < Object.keys(req.body).length; i++) {
      const key = Object.keys(req.body)[i];

      if (key.includes("size") && req.body[key]) {
        const sizeNumber = parseInt(key.replace("size", ""));
        const quantityKey = `quantity${sizeNumber}`;
        const quantityValue = parseInt(req.body[quantityKey]);

        if (!isNaN(sizeNumber) && !isNaN(quantityValue) && quantityValue >= 0) {
          sizes.push({ size: sizeNumber, quantity: quantityValue });
        }
      }
    }

    // update images
    const imageResult = await updateProductImages(req.files, existingProduct.images || []);
    if (!imageResult.success) {
      return res.status(400).json({ errors: imageResult.errors });
    }

    // update product
    await updateProductById(productId, req.body, sizes, imageResult.images);

    res.redirect("/admin/productsView?update=success");
  } catch (error) {
    console.error("Error updating product:", error);
    if (error.message === "Product not found" || error.message === "Offer not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to update product" });
  }
};

const removeImageEditProduct = async (req, res) => {
  try {
    const { index, productId } = req.body;

    await removeProductImage(productId, index);
    res.json({ success: true, message: "Image removed successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Failed to remove image" });
  }
};

const productBlocking = async (req, res) => {
  try {
    const productId = req.query.id;
    await toggleProductStatus(productId, false);
    res.redirect("/admin/productsView");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error blocking product");
  }
};

const productUnblocking = async (req, res) => {
  try {
    const productId = req.query.id;
    await toggleProductStatus(productId, true);
    res.redirect("/admin/productsView");
  } catch (error) {
    console.error(error);
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

// Offer

const loadOffer = async (req, res) => {
  try {
    const offers = await getAllOffers();
    res.render("offer", { offer: offers });
  } catch (error) {
    console.log(error);
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
    console.log(error);
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
    console.error("Error:", error);
    
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
  // product management
  productPage,
  addProduct,
  productVerify,
  editProductPage,
  updateProduct,
  removeImageEditProduct,
  productBlocking,
  productUnblocking,
  deleteProduct,
  //offer management
  loadOffer,
  addOffer,
  loadEditOffer,
  updateOffer,
  deleteOffer,
};