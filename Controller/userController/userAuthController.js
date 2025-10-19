const User = require("../../Model/userModel");
const {
  validateUserRegistration,
} = require("../../helper/utils/userUtils/validationUtils");
const {
  generateOTP,
  sendOTPEmail,
  sendPasswordResetOTP,
} = require("../../helper/utils/userUtils/emailUtils");
const {
  createUser,
  authenticateUser,
  updateUserPassword,
} = require("../../helper/services/userServices/authService");

const loadRegister = async (req, res) => {
  try {
    res.status(200).render("userRegister");
  } catch (error) {
    console.log(error.message);
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const insertUser = async (req, res) => {
  try {
    const errors = validateUserRegistration(req.body);

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        errors: ["An account with this email already exists. Please login."],
      });
    }

    req.session.data = req.body;
    res.status(200).json({
      message: "Registration successful! Please verify your account via OTP.",
      redirect: "/otpGet",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ errors: ["Server error. Please try again later."] });
  }
};

const otpGet = async (req, res) => {
  try {
    const otp = generateOTP();
    req.session.otp = otp;

    const { email, name } = req.session.data;
    await sendOTPEmail(email, name, otp);

    res.status(200).render("userOtp", { message: "" });
  } catch (error) {
    console.error("Error sending email: ", error);
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (req.session.otp === otp) {
      const userData = await createUser(req.session.data);
      if (userData) {
        req.session.userData = userData._id;
        delete req.session.otp;
        delete req.session.data;
        
        
        res.status(200).json({ 
          success: true, 
          message: "Registration successful! Welcome to Soleway.",
          redirect: "/"
        });
      } else {
        res.status(400).json({
          success: false,
          message: "There was an issue registering your account. Please try again."
        });
      }
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid OTP, please try again."
      });
    }
  } catch (error) {
    console.error("Error verifying OTP: ", error);
    res.status(500).json({
      success: false,
      message: "Server error occurred. Please try again."
    });
  }
};

const loadLogin = async (req, res) => {
  try {
    res.status(200).render("userLogin");
  } catch (error) {
    console.log(error.message);
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: `${!email ? "Email" : "Password"} is required.`,
      });
    }

    const result = await authenticateUser(email, password);

    if (!result.success) {
      return res
        .status(result.message.includes("blocked") ? 403 : 400)
        .json({ message: result.message });
    }

    req.session.userData = result.user._id;
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An internal server error occurred" });
  }
};

const googleAuth = async (req, res) => {
  try {
    const googleUser = req.user;
    const email = googleUser.emails[0].value;

    const findUser = await User.findOne({ email: email, is_active: true });

    if (!findUser) {
      return res
        .status(403)
        .send("Your account is inactive or blocked. Please contact support.");
    }

    req.session.userData = findUser;
    res.redirect("/");
  } catch (error) {
    console.log("Error during Google Authentication:", error.message);
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const userLogOut = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err.message);
        return res.status(500).render("user/500", {
          findUser: null,
          cartCount: 0,
          wishlistCount: 0,
        });
      }
      res.status(200).redirect("/");
    });
  } catch (error) {
    console.log(error.message);
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const verifyEmail = async (req, res) => {
  try {
    res.status(200).render("emailVerify");
  } catch (error) {
    console.log(error.message);
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
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
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const resetPasswordOtp = async (req, res) => {
  try {
    const userData = await User.findOne({ email: req.session.email });
    const otp = generateOTP();
    req.session.resetPOtp = otp;

    await sendPasswordResetOTP(req.session.email, userData.name, otp);
    res.status(200).render("passwordOtp");
  } catch (error) {
    console.log(error.message);
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const resetOtp = req.body.otp;
    if (req.session.resetPOtp === resetOtp) {
      res.status(200).render("resetPassword");
    } else {
      res.render("passwordOtp", { message: "Please enter valid OTP" });
    }
  } catch (error) {
    console.log(error.message);
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

const savePassword = async (req, res) => {
  try {
    if (req.body.password === req.body.cpassword) {
      await updateUserPassword(req.session.email, req.body.password);
      res.status(200).redirect("/Login");
    } else {
      res.render("resetPassword", { message: "Passwords do not match" });
    }
  } catch (error) {
    console.log(error.message);
    res
      .status(500)
      .render("user/500", { findUser: null, cartCount: 0, wishlistCount: 0 });
  }
};

module.exports = {
  loadRegister,
  insertUser,
  otpGet,
  verifyOtp,
  loadLogin,
  verifyLogin,
  googleAuth,
  userLogOut,
  verifyEmail,
  resetPassword,
  resetPasswordOtp,
  verifyResetOtp,
  savePassword,
};