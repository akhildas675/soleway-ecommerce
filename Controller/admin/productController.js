const Products = require("../../Model/productModel");
const Category = require("../../Model/categoryModel");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises;
const path = require("path");
const { default: mongoose } = require("mongoose");
const Offer = require("../../Model/OfferModel");

const productPage = async (req, res) => {
  try {
  
    const page = parseInt(req.query.page) || 1;
    const limit = 8; 
    //  number of documents to skip
    const skip = (page - 1) * limit;

    // total count of products for pagination
    const totalProducts = await Products.countDocuments();

    // Fetch paginated products with skip and limit
    const productData = await Products.find()
      .populate("categoryId")
      .populate("offerId")
      .skip(skip)
      .limit(limit);

    // total number of pages
    const totalPages = Math.ceil(totalProducts / limit);

   
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
    const category = await Category.find();
    const offer = await Offer.find({isActive:true});
    res.render("addProduct", { categories: category, offer });
  } catch (error) {
    console.log(error);
  }
};

const productVerify = async (req, res) => {
  try {
    const {
      productName,
      description,
      realPrice,
      offerId,
      brandName,
      category,
    } = req.body;

    // console.log("this is the offer ID", offerId);
    const findOffer = await Offer.findOne({ _id: offerId });
    // console.log("Offer details", findOffer);
    // console.log("offer percentage", findOffer.offerPercentage);

    // Validation
    const errors = [];
    if (!productName || productName.trim().length === 0) {
      errors.push("Please enter a valid product name");
    }
    if (!description || description.trim().length === 0) {
      errors.push("Description cannot be empty");
    } else if (description.length > 150) {
      errors.push("Description cannot exceed 50 characters");
    }

    if (!/^[1-9][0-9]*(\.[0-9]+)?$/.test(realPrice)) {
      errors.push("Please enter a valid price");
    }
    if (!brandName) {
      errors.push("Please enter a valid Brand name");
    }
    if (!mongoose.Types.ObjectId.isValid(category)) {
      errors.push("Invalid category");
    }
    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      errors.push("Invalid offer");
    }

    // Validate size and quantity
    const sizes = [];
    for (const key in req.body) {
      if (key.startsWith("size") && req.body[key]) {
        const size = req.body[key];
        const quantityKey = key.replace("size", "quantity");
        const quantity = req.body[quantityKey];

        const existingSize = sizes.find((s) => s.size === size);

        if (existingSize) {
          errors.push(`Size ${size} is already added.`);
        } else if (!quantity || isNaN(quantity) || parseInt(quantity) < 0) {
          errors.push(`Please enter a valid quantity for size ${size}`);
        } else if (size < 1 || size > 15 || isNaN(size)) {
          errors.push(`Size ${size} must be between 1 and 15`);
        } else {
          sizes.push({ size, quantity: parseInt(quantity) });
        }
      }
    }

    
    if (sizes.length === 0) {
      errors.push("At least one size and quantity must be provided.");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const imagesStore = [];
    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (req.files) {
      let validImageCount = 0;

      for (const file of req.files) {
        if (!allowedImageTypes.includes(file.mimetype)) {
          errors.push(
            "One or more files have invalid type. Allowed types are: " +
              allowedImageTypes.join(", ")
          );
          break;
        }

        const filename = `${uuidv4()}.jpg`;
        const imagePath = path.join("Uploads", filename);
        const imageOutput = path.join(__dirname, "../../public", imagePath);

        try {
         
          await sharp(file.path)
            .resize({ width: 840, height: 840 })
            .toFile(imageOutput);

          imagesStore.push(imagePath.replace(/\\/g, "/"));
          validImageCount++;
        } catch (sharpError) {
          console.error("Sharp Error:", sharpError);
          errors.push("Error processing image.");
          break;
        }
      }

      if (errors.length > 0) {
        return res.json({ errors });
      }

      if (validImageCount < 5) {
        errors.push("Please provide at least 5 images update.");
        return res.json({ errors });
      }
    } else {
      errors.push("No images were uploaded.");
      return res.json({ errors });
    }

    const percentageOfOffer = findOffer.offerPercentage;
    let salePrice = 0;
    let discountAmount;
    if (percentageOfOffer == 0) {
      salePrice = realPrice;
    }
    if (percentageOfOffer > 0) {
      discountAmount = realPrice * (percentageOfOffer / 100);
      salePrice = realPrice - discountAmount;
    }
    // console.log(salePrice, "Sale");

    // console.log(
    //   "type of",
    //   typeof percentageOfOffer,
    //   "the offer",
    //   percentageOfOffer
    // );

    const product = new Products({
      productName,
      description,
      sizes,
      realPrice,
      brandName,
      images: imagesStore,
      offerId: new mongoose.Types.ObjectId(offerId),
      categoryId: new mongoose.Types.ObjectId(category),
      offerPrice: salePrice,
    });

    const productData = await product.save();
    // console.log("productData", productData);

    if (productData) {
      return res.status(201).json({ message: "Product added successfully" });
    } else {
      // console.log("Error saving product");
      return res.status(500).json({ message: "Error adding product" });
    }
  } catch (error) {
    console.log("Error", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const editProductPage = async (req, res) => {
  try {
    const productId = await Products.findById(req.query.id);
    req.session.editProductId = productId;
    const categoryId = await Category.find({ is_active: true });
    const offerId = await Offer.find({ isActive: true });
    res.render("editProduct", {
      categories: categoryId,
      products: productId,
      offer: offerId,
    });
  } catch (error) {
    console.log(error);
  }
};

const updateProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      realPrice,
      category,
      brandName,
      offerId,
    } = req.body;

    const findOffer = await Offer.findOne({ _id: offerId });

    if (!findOffer) {
      return res.status(400).json({ error: "Offer not found" });
    }

    // console.log("Offer details from product update:", findOffer);

    const sizes = [];
    const errors = [];
    const images = req.files;

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

    // console.log("Received sizes:", sizes);

    const productId = req.query.productId;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const existingProduct = await Products.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    const imagesStore = existingProduct.images || [];
    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (req.files && req.files.length > 0) {
      let validImageCount = imagesStore.length;

      for (const file of req.files) {
        if (!allowedImageTypes.includes(file.mimetype)) {
          errors.push(
            `Invalid file type for image. Allowed types are: ${allowedImageTypes.join(
              ", "
            )}`
          );
          break;
        }

        const filename = `${uuidv4()}.jpg`;
        const imagePath = path.join("Uploads", filename);
        const imageOutput = path.join(__dirname, "../../public", imagePath);

        try {
          await sharp(file.path)
            .resize({ width: 840, height: 840 })
            .toFile(imageOutput);

          imagesStore.push(imagePath.replace(/\\/g, "/"));
          validImageCount++;
        } catch (sharpError) {
          console.error("Error processing image with Sharp:", sharpError);
          errors.push("Error processing image.");
          break;
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      if (validImageCount < 5) {
        errors.push("Please provide at least 5 images.");
        return res.status(400).json({ errors });
      }
    } else if (imagesStore.length < 5) {
      errors.push("Please provide at least 5 images.");
      return res.status(400).json({ errors });
    }

    let salePrice = realPrice;
    if (findOffer.offerPercentage > 0) {
      // console.log(findOffer.offerPercentage);
      const discountAmount = realPrice * (findOffer.offerPercentage / 100);
      salePrice = realPrice - discountAmount;
    }

    // console.log("Sale price after discount:", salePrice);

    existingProduct.productName = productName;
    existingProduct.description = description;
    existingProduct.realPrice = realPrice;
    existingProduct.brandName = brandName;
    existingProduct.categoryId = category;
    existingProduct.sizes = sizes;
    existingProduct.images = imagesStore;
    existingProduct.offerId = offerId;
    existingProduct.offerPrice = salePrice;

    await existingProduct.save();

    res.redirect("/admin/productsView?update=success");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
};


const removeImageEditproduct = async (req, res) => {
  // console.log("remove function worked");
  const { index, productId } = req.body;
  // console.log(index);

  try {
    const product = await Products.findById(productId);

    if (!product || !product.images || index >= product.images.length) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product or image index" });
    }

    product.images.splice(index, 1);

    await product.save();

    res.json({ success: true, message: "Image removed successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Failed to remove image" });
  }
};

// Blocking Product
const productBlocking = async (req, res) => {
  try {
    const productId = req.query.id;
    // console.log("productID:", productId);
    await Products.findByIdAndUpdate(productId, { is_active: false });
    res.redirect("/admin/productsView");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error blocking product");
  }
};

// Unblocking Product
const productUnblocking = async (req, res) => {
  try {
    const productId = req.query.id;
    await Products.findByIdAndUpdate(productId, { is_active: true });
    res.redirect("/admin/productsView");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error unblocking product");
  }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    // console.log("Product ID:", productId);

   
    const productDelete = await Products.findByIdAndDelete(productId);

    if (!productDelete) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const loadOffer = async (req, res) => {
  try {
    const offerFind = await Offer.find();
    res.render("offer", { offer: offerFind });
  } catch (error) {
    console.log(error);
  }
};


//Add offer 
const addOffer = async (req, res) => {
  try {
    const { offerName, offerPercentage } = req.body;

    let errors = [];

    const percentage = Number(offerPercentage);

   
    if (!offerName || offerName.trim() === "") {
      errors.push("Please enter a valid Offer Name.");
    }

    // Validate offer percentage
    if (
      percentage === undefined ||
      percentage === null ||
      isNaN(percentage) ||
      percentage < 0 ||
      percentage > 70
    ) {
      errors.push("Please enter a valid discount percentage between 0 and 70.");
    }

    
    if (errors.length > 0) {
      return res.json({ success: false, errors });
    }

    // already exists
    const existingOffer = await Offer.findOne({ offerPercentage: percentage });
    if (existingOffer) {
      return res.json({
        success: false,
        errors: [
          `An offer with ${percentage}% discount already exists. Please enter a different percentage.`,
        ],
      });
    }

    // Create a new offer
    const newOffer = new Offer({
      offerName: offerName.trim(), 
      offerPercentage: percentage,
      isActive: true,
    });

    // Save 
    await newOffer.save();

    return res.json({
      success: true,
      message: "Offer added successfully",
    });
  } catch (error) {
    console.error("Error adding offer:", error);
    return res.json({
      success: false,
      message: "Server error",
    });
  }
};


const loadEditOffer = async (req, res) => {
  try {
    const offerId = req.query.id;
    const findOffer = await Offer.findById(req.query.id);
    res.render("editOffer", { offer: findOffer });
  } catch (error) {
    console.log(error);
  }
};

const updateOffer = async (req, res) => {
  try {
    const { offerId, offerName, offerPercentage } = req.body;

    let errors = [];

    
    if (!offerName || offerName.trim() === "") {
      errors.push("Please enter a valid Offer Name");
    }

  
    if (
      offerPercentage === undefined ||
      offerPercentage === null ||
      isNaN(offerPercentage) ||
      offerPercentage < 0 ||
      offerPercentage > 70
    ) {
      errors.push("Please enter a valid discount percentage between 0 and 70.");
    }

   
    if (errors.length > 0) {
      return res.json({ success: false, errors });
    }

    
    const existingOffer = await Offer.findOne({
      offerPercentage: offerPercentage,
      _id: { $ne: offerId }, 
    });

    if (existingOffer) {
      return res.json({
        success: false,
        message: `An offer with ${offerPercentage}% discount already exists.`,
      });
    }

   
    const offer = await Offer.findByIdAndUpdate(offerId, {
      offerName: offerName,
      offerPercentage: offerPercentage,
    },); 

    if (!offer) {
      return res.json({
        success: false,
        message: "Offer not found",
      });
    }

    res.json({
      success: true,
      message: "Offer updated successfully",
      offer,
    });
  } catch (error) {
    console.error("Error:", error);
    res.json({
      success: false,
      message: "Error updating offer",
    });
  }
};


// const blockOffer = async (req, res) => {
//   try {
//     const offerId = req.query.id;
//     console.log("Blocking offer ID: ", offerId);
    
//     await Offer.findByIdAndUpdate({_id: offerId}, {isActive: false});

//     res.json({ success: true });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Error blocking offer" });
//   }
// };

// const unblockOffer = async (req, res) => {
//   try {
//     const offerId = req.query.id;
//     console.log("Unblocking offer ID: ", offerId);

//     await Offer.findByIdAndUpdate({_id: offerId}, {isActive: true});

//     res.json({ success: true });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Error unblocking offer" });
//   }
// };


const deleteOffer = async (req, res) => {
  try {
    const offerId = req.query.id;

    const deletedOffer = await Offer.findByIdAndDelete(offerId);

    if (!deletedOffer) {
      return res.json({ success: false, message: "Offer not found" });
    }

    res.json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.json({ success: false, message: "Error deleting offer" });
  }
};





module.exports = {
  addProduct,
  // findThePage,
  productPage,
  addProduct,
  productVerify,
  editProductPage,
  updateProduct,
  productBlocking,
  productUnblocking,
  deleteProduct,
  removeImageEditproduct,
  loadOffer,
  addOffer,
  loadEditOffer,
  updateOffer,
  // blockOffer,
  // unblockOffer,
  deleteOffer,
};
