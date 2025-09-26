const User = require("../../../Model/userModel");
const bcrypt = require("bcrypt");

const authenticateAdmin = async (email, password) => {
  try {
    const adminData = await User.findOne({ email });

    if (!adminData) {
      return { success: false, message: "Admin not found", statusCode: 404 };
    }

    const passwordMatch = await bcrypt.compare(password, adminData.password);
    
    if (!passwordMatch) {
      return { success: false, message: "Incorrect password", statusCode: 401 };
    }

    if (!adminData.is_admin) {
      return { success: false, message: "Access denied. Not an admin.", statusCode: 403 };
    }

    return { success: true, adminData };
  } catch (error) {
    console.error("Error in admin authentication:", error);
    return { success: false, message: "Internal server error", statusCode: 500 };
  }
};

module.exports = { authenticateAdmin };