const User = require("../../Model/userModel");
const Category = require("../../Model/categoryModel");
const Products = require("../../Model/productModel");
const Cart = require("../../Model/cartModel");
const bcrypt = require("bcrypt");
const Address = require("../../Model/addressModel");
const nodemailer = require("nodemailer");
const session = require("express-session");
const Order = require("../../Model/orderModel");

const loadHome = async (req, res) => {
  try {
    const userId = req.session.userData;
    // console.log(userId,"user id");
    const findUser = await User.findById(userId);
    // console.log(findUser);
    const category = await Category.find();
    const product = await Products.find({ is_active: true }).limit(8);
    const product1 = await Products.find({ is_active: true })
      .sort({ createdAt: -1 })
      .limit(3);
    res.status(200).render("index", {
      findUser,
      categories: category,
      products: product,
      newArrival: product1,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const googleAuth = async (req, res) => {
  try {
    const googleUser = req.user;
    const email = googleUser.emails[0].value;
    const findUser = await User.findOne({ email });
    // console.log('finduser',findUser);

    if (!findUser) {
      res.redirect("/userRegister");
    }
    req.session.userData = findUser;
    // console.log('woohooo');

    res.redirect("/");
  } catch (error) {
    console.log("Error during the google Authentication", error.message);
  }
};

const loadRegister = async (req, res) => {
  try {
    res.status(200).render("userRegister");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const insertUser = async (req, res) => {
  try {
    const { name, email, password, cpassword, mobile } = req.body;
    let errors = [];

    if (!name || !email || !password || !cpassword || !mobile) {
      errors.push("All fields are required");
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailPattern.test(email)) {
      errors.push("Please enter a valid email address");
    }

    if (password && password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }

    if (password && cpassword && password !== cpassword) {
      errors.push("Passwords do not match");
    }

    const mobilePattern = /^[0-9]{10}$/;
    if (mobile && !mobilePattern.test(mobile)) {
      errors.push("Please enter a valid mobile number");
    }

    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(", ") });
    }

    const matchEmail = await User.findOne({ email });
    if (matchEmail) {
      return res
        .status(400)
        .json({ message: "Already have an account, please login" });
    }

    const thisIsRegisterData = {
      name,
      email,
      password,
      mobile,
    };

    req.session.data = thisIsRegisterData;
    res.status(200).json({ redirect: "/otpGet" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

const otpGet = async (req, res) => {
  try {
    console.log("..................................................");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSKEY,
      },
    });

    let randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("This is the otp", randomOtp);
    req.session.otp = randomOtp;

    const { email, name } = req.session.data;
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: `Hello ${name}`,
      text: `Your verification OTP is ${randomOtp}`,
    };

    try {
      let info = await transporter.sendMail(mailOptions);
      console.log("Email sent: " + info.response);
      res.status(200).render("userOtp", { message: "" });
    } catch (error) {
      console.error("Error sending email: ", error);
      res.status(500).send("Error sending email");
    }
  } catch (error) {
    console.error("Server Error: ", error);
    res.status(500).send("Server Error");
  }
};

const verifyOtp = async (req, res) => {
  try {
    let otp = req.body.otp;
    if (req.session.otp === otp) {
      const { email, name, mobile, password } = req.session.data;
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        name: name,
        email: email,
        mobile: mobile,
        password: hashedPassword,
      });
      const userData = await user.save();
      if (userData) {
        req.session.user = userData._id;
        res.status(200).render("userLogin");
      } else {
        res.render("userOtp", {
          message: "OTP is incorrect, please try again",
        });
      }
    } else {
      res.render("userOtp", { message: "Invalid Otp, please enter valid Otp" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("userRegister", { message: "Server Error" });
  }
};

const loadLogin = async (req, res) => {
  try {
    res.status(200).render("userLogin");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email: email });

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);
      if (passwordMatch) {
        if (userData.is_active) {
          req.session.userData = userData._id;
          res.status(200).redirect("/");
        } else {
          res.render("userLogin", {
            message: "Your account is temporarily blocked by admin",
          });
        }
      } else {
        res.render("userLogin", { message: "Incorrect email or password" });
      }
    } else {
      res.render("userLogin", {
        message: "You have no account, please register",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).render("userLogin", { message: "Login failed" });
  }
};

const userLogOut = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err.message);
        return res.status(500).send("Unable to log out");
      }
      res.status(200).redirect("/");
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const verifyEmail = async (req, res) => {
  try {
    res.status(200).render("emailVerify");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const resetPassword = async (req, res) => {
  try {
    const matchEmail = await User.findOne({ email: req.body.email });
    if (matchEmail) {
      req.session.email = req.body.email;
      res.status(200).redirect("/userNewOtp");
    } else {
      res.render("emailVerify", {
        message: "You have no account, please register",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const resetPasswordOtp = async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSKEY,
      },
    });

    const userData = await User.findOne({ email: req.session.email });

    let randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
    req.session.resetPOtp = randomOtp;
    console.log(randomOtp, "forget password otp");

    const resetPasswordOptions = {
      from: process.env.EMAIL,
      to: req.session.email,
      subject: `Hello ${userData.name}`,
      text: `Your forgot password verifying OTP is ${randomOtp}`,
    };

    try {
      let info = await transporter.sendMail(resetPasswordOptions);
      console.log("Email sent: " + info.response);
      res.status(200).render("passwordOtp");
    } catch (error) {
      console.log("Error sending email: " + error);
      res.status(500).send("Error sending email");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    let resetOtp = req.body.otp;
    if (req.session.resetPOtp === resetOtp) {
      res.status(200).render("resetPassword");
    } else {
      res.render("passwordOtp", { message: "Please enter valid OTP" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const savePassword = async (req, res) => {
  try {
    if (req.body.password === req.body.cpassword) {
      let newPassword = req.body.password;
      let userData = await User.findOne({ email: req.session.email });
      hashedPassword = await bcrypt.hash(newPassword, 10);

      userData.password = hashedPassword;
      await userData.save();
      res.status(200).redirect("/userLogin");
    } else {
      res.render("resetPassword", { message: "Passwords do not match" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const productDetailedView = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);

    const productId = req.query.id;
    // console.log("productId:", productId);

    const products = await Products.findOne({ _id: productId }).populate(
      "categoryId"
    );

    const sizeOrder = products.sizes.sort((a, b) => a.size - b.size);

    // console.log("product:", products);
    // console.log("Category ID:", products.categoryId._id);

    const relatedProduct = await Products.find({
      categoryId: products.categoryId._id,
      _id: { $ne: productId },
    }).limit(4);

    // console.log("Related products:", relatedProduct);
    res.render("productDetail", {
      products,
      findUser,
      relatedProduct,
      sizeOrder,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const productShop = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);

    let sortOrder = {};
    if (req.query.sort === "lowToHigh") {
      sortOrder = { realPrice: 1 };
    } else if (req.query.sort === "HighToLow") {
      sortOrder = { realPrice: -1 };
    }
    console.log(sortOrder, "price sortorder");

    let nameSort = {};

    if (req.query.sort === "nameSortAToZ") {
      nameSort = { productName: 1 };
    } else if (req.query.sort === "nameSortZToA") {
      nameSort = { productName: -1 };
    }

    const products = await Products.find({ is_active: true })
      .populate("categoryId")
      .sort(sortOrder)
      .sort(nameSort);

    res.render("shopPage", { findUser, products });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  }
};

const userDetails = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const addresses = await Address.find({ userId: userId });
    const orderedData = await Order.find();

    res.render("userAccount", { findUser, addresses, orderedData });
  } catch (error) {
    console.log(error);
  }
};

const addUserAddress = async (req, res) => {
  try {
    const userId = req.session.userData;
    const { name, mobile, homeAddress, city, district, state, pincode } =
      req.body;
    console.log("Add userAddress data from body", req.body);

    let errors = [];
    if (
      !name ||
      !mobile ||
      !homeAddress ||
      !city ||
      !district ||
      !state ||
      !pincode
    ) {
      errors.push("All fields are required");
    }

    const mobilePattern = /^[0-9]{10}$/;
    if (mobile && !mobilePattern.test(mobile)) {
      errors.push("Please enter a valid number");
    }
    if (errors.length > 0) {
      return res.json({ message: errors.join(",") });
    }

    const address = new Address({
      userId: userId,
      name: name,
      mobile: mobile,
      homeAddress: homeAddress,
      city: city,
      district: district,
      state: state,
      pincode: pincode,
    });
    const saveAddress = await address.save();
    res.redirect("/userInfo");
  } catch (error) {
    console.log(error);
  }
};

const editAddressPage = async (req, res) => {
  try {
    const addressId = req.query.id;
    const userId = req.session.userData;

    // console.log("Edit Address Page - Address ID:", addressId);
    // console.log("Edit Address Page - User ID:", userId);

    const address = await Address.findOne({ _id: addressId, userId: userId });
    const findUser = await User.findById(userId);

    // console.log("Address from edit",address)
    // console.log("Find user from edit",findUser)

    res.render("editAddress", { address, findUser });
  } catch (error) {
    console.log("Error in editAddressPage:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const editAddress = async (req, res) => {
  try {
    const addressId = req.body.addressId;
    const userId = req.session.userData;

    console.log("Edit Address - Address ID form edit address page", addressId);
    console.log("Edit Address - User ID  from edit address page", userId);

    const updatedAddress = await Address.findOneAndUpdate(
      { _id: addressId, userId: userId },
      {
        name: req.body.name,
        mobile: req.body.mobile,
        homeAddress: req.body.homeAddress,
        city: req.body.city,
        district: req.body.district,
        state: req.body.state,
        pincode: req.body.pincode,
      }
    );

    res.redirect("/userInfo");
  } catch (error) {
    console.log("Error in editAddress:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.userData;
    const addressId = req.body.addressId;

    console.log("Delete Address - User ID:", userId);
    console.log("Delete Address - Address ID:", addressId);

    const address = await Address.findOneAndDelete({
      _id: addressId,
      userId: userId,
    });

    res.status(200).send("Address deleted successfully");
  } catch (error) {
    console.log("Error in deleteAddress:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const orderInfos = async (req, res) => {
  try {
    const orderId = req.query.id;
    const userId = req.session.userData;

    const findUser = await User.findById(userId);
    const addresses = await Address.find({ userId: userId });

    const orderedData = await Order.findOne({
      _id: orderId,
      userId: userId,
    }).populate("products.productId");

    console.log("Ordered Data Products:", orderedData.products); //i get the product details

    orderedData.products.forEach((product) => {
      if (product.productId && typeof product.productId === "object") {
        console.log("Product Name:", product.productId.productName);
      } else {
        console.log("Product ID not populated:", product.productId);
      }
    });

    res.render("orderDetails", { findUser, addresses, orderedData });
  } catch (error) {
    console.error("Error order details shows :", error);
    res.send("Internal Server Error");
  }
};

// const checking = async (req, res) => {
//   try {

//     const userId = req.session.userData;
//     const findUser=await User.findById(userId)

//     res.status(200).render("userInfo",{findUser});
//   } catch (error) {
//     console.log(error);
//     res.status(500).send("Server Error");
//   }
// };

const searchProducts = async (req, res) => {
  try {
    const userId = req.session.userData;
    const findUser = await User.findById(userId);
    const product = await Products.find();
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  loadHome,
  loadRegister,
  insertUser,
  loadLogin,
  verifyLogin,
  otpGet,
  verifyOtp,
  userLogOut,
  // checking,
  verifyEmail,
  resetPassword,
  resetPasswordOtp,
  verifyResetOtp,
  savePassword,
  addUserAddress,
  editAddressPage,
  editAddress,
  productDetailedView,
  productShop,
  userDetails,
  orderInfos,
  googleAuth,
  searchProducts,
  deleteAddress,
};
