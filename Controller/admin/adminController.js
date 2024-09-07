const User = require("../../Model/userModel");
const Products = require("../../Model/productModel");
const Category = require("../../Model/categoryModel");
const Cart = require("../../Model/cartModel");
const Address = require("../../Model/addressModel");
const Order = require("../../Model/orderModel");
const bcrypt = require("bcrypt");






const adminLogin = async (req, res) => {
  try {
    res.render("adminLogin",{message:null});
  } catch (error) {
    console.log(error);
  }
};
const verifyAdminLogin = async (req, res) => {
    try {
      const { email, password } = req.body;
    
  
      const adminData = await User.findOne({ email });
  
      if (adminData) {
        const passwordMatch = await bcrypt.compare(password, adminData.password);
      
        if (passwordMatch) {
          if (adminData.is_admin) {
            req.session.adminData = adminData._id;
           
             res.redirect("/admin/adminHome");
          } else {
         res.render("adminLogin", { message: "Access denied. Not an admin." });
          }
        } else {
           res.render("adminLogin", { message: "Incorrect password" });
        }
      } else {
        res.render("adminLogin", { message: "Admin not found" });
      }
    } catch (error) {
      console.error(error);
     
    }
  };
  
  
  

const adminLoad = async (req, res) => {
  try {
    // const user = User.find()
    // console.log("it came hereeeeeeeeeeeeee")
    res.render("dashboard");
  } catch (error) {
    console.log(error);
  }
};

const loadUsers = async (req, res) => {
  try {
    const userData = await User.find();

    res.render("users", { users: userData });
  } catch (error) {
    console.log(error);
  }
};

const userBlocking = async (req, res) => {
  try {
    const userId = req.query.id;

    // console.log(userId,'This is the user ID')
    const userBlock = await User.findByIdAndUpdate(userId, {
      is_active: false,
    });
    // console.log(userBlock,'user Blocking')

    res.redirect("/admin/usersView");
  } catch (error) {
    console.log(error);
  }
};

const userUnblocking = async (req, res) => {
  try {
    const userId = req.query.id;
    // console.log(userId)
    const userUnBlock = await User.findByIdAndUpdate(userId, {
      is_active: true,
    });
    // console.log(userUnBlock,'userUnblocking');
    res.redirect("/admin/usersView");
  } catch (error) {
    console.log(error);
  }
};

const adminLogout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
        return res.status(500).send("Unable to log out");
      }
    });
    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
};

const adminOrderMng = async (req, res) => {
  try {
    const userId = req.session.userData;

    const orderedData = await Order.find().populate("userId");
    const findUser = await User.find(userId);
    console.log("Find user in admin order mng", orderedData);

    res.render("adminOrderList", { orderedData });
  } catch (error) {
    console.log(error);
  }
};

const orderDetailsOfUser = async (req, res) => {
  try {
    const { orderId } = req.query.id;

    console.log("this is the req.query.id", req.query.id);

    const userId = req.session.userData;

    const findUser = await User.find(userId);
    const orderedData = await Order.findOne({
      _id: orderId,
      userId: userId,
    }).populate("products.productId");
    console.log("Find user in admin order mng", orderedData.products.name);

    res.render("orderInfo", { orderedData });
  } catch (error) {
    console.log(error);
  }
};

const loki = async (req, res) => {
  try {
    res.render("var");
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  adminLoad,
  loadUsers,
  adminLogout,
  userBlocking,
  userUnblocking,
  adminOrderMng,
  orderDetailsOfUser,
  adminLogin,
  verifyAdminLogin,

  loki,
};
