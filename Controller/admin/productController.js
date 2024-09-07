const Products = require("../../Model/productModel");
const Category = require("../../Model/categoryModel");
const sharp = require('sharp');
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { default: mongoose } = require("mongoose");

;

const productPage = async (req, res) => {
  try {
    const productData = await Products.find().populate("categoryId");
    // console.log("product data", productData);
    res.render("productsList", { products: productData });
  } catch (error) {
    console.log(error);
  }
};

const addProduct = async (req, res) => {
  try {
    const category = await Category.find();
    res.render("addProduct", { categories: category });
  } catch (error) {
    console.log(error);
  }
};





// uploading images in to the files

// const productVerify = async (req, res) => {
//   try {
//     console.log("add product :",req.body)
//     console.log("This is the category id",req.body.category)
//     const {
//       productName,
//       description,
//       realPrice,
//       category,
//     } = req.body;

//     // const categories=await Category.find()

//     if (!/^[a-zA-Z0-9_.-]*$/.test(req.body.productName)){
//         res.render('addProduct',{message:'Please enter valid product name'})

//     }

    



//     // console.log("This data FormData", req.body, "data from body");
//     const imagesStore = [];


//     // const size = [
// //     {6: req.body.six},
// //     {7: req.body.seven},
// //     {7: req.body.seven},
// //     {9: req.body.seven},
// // ]
// // const newProduct = new Products([{
// //     name:req.body.name,price:req.body.price,size:size
// // }])
// // if(await newProduct.save()) {--
// //     console("saved")
// // }
// // console.log(category)





//     const allSize = [];

//     const size7 = {
//       size: "7",
//       quantity: req.body.stockOf7,
//     };
//     const size8 = {
//       size: "8",
//       quantity: req.body.stockOf8,
//     };
//     const size9 = {
//       size: "9",
//       quantity: req.body.stockOf9,
//     };
//     const size10 = {
//       size: "10",
//       quantity: req.body.stockOf10,
//     };

//     allSize.push(size7, size8, size9, size10);
//     console.log(allSize);

//     if (req.files) {
//       for (const file of req.files) {
//         const filename = `${uuidv4()}.jpg`;

//         const imagePath = path.join("Uploads", filename);

//         const imageOutput = path.join(__dirname, "../../public", imagePath);

//         fs.mkdirSync(path.dirname(imageOutput), { recursive: true });

//         fs.renameSync(file.path, imageOutput);

//         imagesStore.push(imagePath.replace(/\\/g, "/"));
//       }
//     }

//     // const categorySelect = await Category.find({categoryName: categoryName });
//     // if (!categorySelect) {
//     //   return res.status(404).send("Category not found");
//     // }

//     // Creating a new product
//     const product = new Products({
//       productName,
//       description,
//       sizes: allSize,
//       realPrice,
//       categoryId: new mongoose.Types.ObjectId(category),
//       images: imagesStore,
//     });

    

//     console.log("all products details", product.categoryId);

//     const productData = await product.save();
//     if (productData) {
//       res.redirect("/admin/productsView");
//     } else {
//       console.log("Error saving product");
//       res.status(500).send("Error adding product");
//     }
    


//   } catch (error) {
//     console.log("Error", error.message);
//     res.status(500).send("Internal server error");
//   }
// };



















// edit product file












const productVerify = async (req, res) => {
  try {
    const {
      productName,
      description,
      realPrice,
      brandName,
      category
    } = req.body;

    // Validation
    const errors = [];
    if (!productName || productName.trim().length === 0) {
      errors.push('Please enter a valid product name');
    }
    if (!description || description.trim().length === 0) {
      errors.push('Description cannot be empty');
    } else if (description.length > 150) {
      errors.push('Description cannot exceed 50 characters');
    }

    if (!/^[1-9][0-9]*(\.[0-9]+)?$/.test(realPrice)) {
      errors.push('Please enter a valid price');
    }
    if (!brandName || brandName.trim().length === 0) {
      errors.push('Please enter a valid Brand name');
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      errors.push('Invalid category');
    }

    // Validate size and quantity
    const sizes = [];
    for (const key in req.body) {
      if (key.startsWith('size') && req.body[key]) {
        const size = req.body[key];
        const quantityKey = key.replace('size', 'quantity');
        const quantity = req.body[quantityKey];

        if (!quantity || isNaN(quantity) || parseInt(quantity) <0) {
          errors.push(`Please enter a valid quantity for size ${size}`);
        } else if (size < 1 || size > 15 || isNaN(size)) {
          errors.push(`Size ${size} must be between 1 and 15`);
        } else {
          sizes.push({ size, quantity: parseInt(quantity) });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const imagesStore = [];
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (req.files) {
      let validImageCount = 0;

      for (const file of req.files) {
        if (!allowedImageTypes.includes(file.mimetype)) {
          errors.push('One or more files have invalid type. Allowed types are: ' + allowedImageTypes.join(', '));
          break;
        }

        const filename = `${uuidv4()}.jpg`;
        const imagePath = path.join('Uploads', filename);
        const imageOutput = path.join(__dirname, '../../public', imagePath);

        try {
          await sharp(file.path)
            .resize({ width: 840, height: 840 })
            .toFile(imageOutput);

          imagesStore.push(imagePath.replace(/\\/g, '/'));
          validImageCount++;

          fs.unlink(file.path, (err) => {
            if (err) {
              console.error(`Error deleting file: ${err}`);
            } else {
              console.log(`File deleted: ${file.path}`);
            }
          });
        } catch (sharpError) {
          console.error("Sharp Error:", sharpError);
          errors.push("Error processing image.");
          break;
        }
      }

      if (errors.length > 0) {
        return res.json({ errors });
      }

      if (validImageCount < 3) {
        errors.push('Please provide at least 3 images update.');
        return res.json({ errors });
      }
    } else {
      errors.push('No images were uploaded.');
      return res.json({ errors });
    }

    const product = new Products({
      productName,
      description,
      sizes,
      realPrice,
      brandName,
      categoryId: new mongoose.Types.ObjectId(category),
      images: imagesStore
    });

    const productData = await product.save();

    if (productData) {
      return res.status(201).json({ message: 'Product added successfully' });
    } else {
      console.log('Error saving product');
      return res.status(500).json({ message: 'Error adding product' });
    }
  } catch (error) {
    console.log('Error', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};




const editProductPage = async (req, res) => {
  try {
    const productId = await Products.findById(req.query.id);
    req.session.editProductId = productId;
    const categoryId = await Category.find({ is_active: true });
    res.render("editProduct", { categories: categoryId, products: productId });
  } catch (error) {
    console.log(error);
  }
};


const updateProduct = async (req, res) => {
  try {
    const { productName, description, realPrice, category } = req.body;

    const sizes = [];
    const errors = [];
    const images = req.files;

    


    for (let i = 0; i < Object.keys(req.body).length; i++) {
        const key = Object.keys(req.body)[i];
        
        
        if (key.includes('size') && req.body[key]) {
           
            const sizeNumber = parseInt(key.replace('size', ''));
            console.log("SizeNumber",sizeNumber)
            
        
            const quantityKey = `quantity${sizeNumber}`;
            const quantityValue = parseInt(req.body[quantityKey]);
    
            // Push the size and quantity if valid
            if (!isNaN(sizeNumber) && !isNaN(quantityValue) && quantityValue >= 0) {
                sizes.push({ size: sizeNumber, quantity: quantityValue });
            }
        }
    }
    

    console.log("Received sizes:", sizes);

    const productId = req.query.productId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.send({ error: 'Invalid product ID' });
    }

    const existingProduct = await Products.findById(productId);
    if (!existingProduct) {
      return res.send({ error: 'Product not found' });
    }

    const imagesStore = existingProduct.images || [];
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (req.files) {
      let validImageCount = imagesStore.length;

      for (const file of req.files) {
        if (!allowedImageTypes.includes(file.mimetype)) {
          errors.push('One or more files have invalid type. Allowed types are: ' + allowedImageTypes.join(', '));
          break;
        }

        const filename = `${uuidv4()}.jpg`;
        const imagePath = path.join('Uploads', filename);
        const imageOutput = path.join(__dirname, '../../public', imagePath);

        try {
          await sharp(file.path)
            .resize({ width: 840, height: 840 })
            .toFile(imageOutput);

          imagesStore.push(imagePath.replace(/\\/g, '/'));
          validImageCount++;

          fs.unlink(file.path, (err) => {
            if (err) {
              console.error(`Error deleting file: ${err}`);
            } else {
              console.log(`File deleted: ${file.path}`);
            }
          });
        } catch (sharpError) {
          console.error("Sharp Error:", sharpError);
          errors.push("Error processing image.");
          break;
        }
      }

      if (errors.length > 0) {
        return res.json({ errors });
      }

      if (validImageCount < 3) {
        errors.push('Please provide at least 3 images.');
        return res.json({ errors });
      }
    } else if (imagesStore.length < 3) {
      errors.push('Please provide at least 3 images.');
      return res.json({ errors });
    }

     existingProduct.productName = productName;
    existingProduct.description = description;
    existingProduct.realPrice = realPrice;
    existingProduct.categoryId = category;
    existingProduct.sizes = sizes;
    existingProduct.images = imagesStore;

    await existingProduct.save();

  
    res.redirect('/admin/productsView?update=success');
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).send({ error: 'Failed to update product' });
  }
};

const removeImageEditproduct = async (req, res) => {
  console.log("remove function worked");
  const { index, productId } = req.body;
  console.log(index)

  try {
    const product = await Products.findById(productId);

    if (!product || !product.images || index >= product.images.length) {
      return res.status(400).json({ success: false, message: 'Invalid product or image index' });
    }

   
    product.images.splice(index, 1);

    
    await product.save();

    res.json({ success: true, message: 'Image removed successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove image' });
  }
};

// Blocking Product
const productBlocking = async (req, res) => {
  try {
    const productId = req.query.id;
    console.log("productID:", productId);
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
  removeImageEditproduct,
};
