const Category = require("../../Model/categoryModel");
const {
  validateCategoryData,
  sanitizeCategoryName
} = require("../../helper/utils/adminUtils/categoryValidationUtils");
const {
  getAllCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategoryById
} = require("../../helper/services/adminServices/categoryService");


// RENDER CATEGORY PAGE
const categoryPage = async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.render("categories", { category: categories });
  } catch (error) {
    console.error("Error loading categories:", error);
    res.status(500).render("categories", { category: [] });
  }
};


// CREATE CATEGORY (AJAX)
const categoryAdding = async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    const errors = validateCategoryData(categoryName, description);

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0] });
    }

    const newCategory = await createCategory(categoryName, description);
    res.json({ success: true, category: newCategory });
  } catch (error) {
    if (error.message === "Category already exists") {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }
    console.error("Error adding category:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// UPDATE CATEGORY (AJAX)
const editingCategory = async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    const { id } = req.params;

    const errors = validateCategoryData(categoryName, description);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0] });
    }

    const updated = await updateCategory(id, categoryName, description);
    res.json({ success: true, category: updated });
  } catch (error) {
    if (error.message === "Category already exists") {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }
    console.error("Error updating category:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// TOGGLE ACTIVE/INACTIVE (AJAX)
const toggleCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const updated = await toggleCategoryStatus(id, is_active);
    res.json({ success: true, category: updated });
  } catch (error) {
    console.error("Error toggling category:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


// DELETE CATEGORY (AJAX)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteCategoryById(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


module.exports = {
  categoryPage,
  categoryAdding,
  editingCategory,
  toggleCategory,
  deleteCategory
};
