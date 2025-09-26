const User = require("../../../Model/userModel");

const getAllUsers = async () => {
  return await User.find();
};

const toggleUserStatus = async (userId, isActive) => {
  return await User.findByIdAndUpdate(userId, { is_active: isActive });
};

module.exports = { getAllUsers, toggleUserStatus };