const User = require("../../../Model/userModel");
const bcrypt = require("bcrypt");

const createUser = async (userData) => {
  const { name, email, mobile, password } = userData;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = new User({ name, email, mobile, password: hashedPassword });
  return await user.save();
};

const authenticateUser = async (email, password) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    return { success: false, message: "You have no account, please register" };
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  
  if (!passwordMatch) {
    return { success: false, message: "Incorrect email or password" };
  }

  if (!user.is_active) {
    return { success: false, message: "Your account is blocked" };
  }

  return { success: true, user };
};

const updateUserPassword = async (email, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return await User.findOneAndUpdate(
    { email },
    { password: hashedPassword }
  );
};

module.exports = { createUser, authenticateUser, updateUserPassword };
