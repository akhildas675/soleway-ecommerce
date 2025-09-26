const Category = require("../../../Model/categoryModel");

const getAllCategories = async () => {
  return await Category.find();
};

const getCategoryById = async (categoryId) => {
  return await Category.findById(categoryId);
};

const checkCategoryExists = async (categoryName, excludeId = null) => {
  const query = {
    categoryName: { $regex: new RegExp("^" + categoryName + "$", "i") }
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return await Category.findOne(query);
};

const createCategory = async (categoryName, description) => {
  const sanitizedName = categoryName.trim();
  
  const existingCategory = await checkCategoryExists(sanitizedName);
  if (existingCategory) {
    throw new Error("Category already exists");
  }

  const newCategory = new Category({
    categoryName: sanitizedName,
    description: description.trim(),
  });

  return await newCategory.save();
};

const updateCategory = async (categoryId, categoryName, description) => {
  const sanitizedName = categoryName.trim();
  
  const existingCategory = await checkCategoryExists(sanitizedName, categoryId);
  if (existingCategory) {
    throw new Error("Category already exists");
  }

  return await Category.findByIdAndUpdate(
    categoryId,
    { 
      categoryName: sanitizedName, 
      description: description.trim() 
    },
    { new: true }
  );
};

const toggleCategoryStatus = async (categoryId, isActive) => {
  return await Category.findByIdAndUpdate(categoryId, { is_active: isActive });
};

const deleteCategoryById = async (categoryId) => {
  return await Category.findByIdAndDelete(categoryId);
};

const getCategoryStats = async () => {
  const [totalCategories, activeCategories, inactiveCategories] = await Promise.all([
    Category.countDocuments(),
    Category.countDocuments({ is_active: true }),
    Category.countDocuments({ is_active: false })
  ]);

  return { totalCategories, activeCategories, inactiveCategories };
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategoryById,
  getCategoryStats,
  checkCategoryExists
};
