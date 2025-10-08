const Category = require("../../Model/categoryModel");

// Import services and utilities
const { validateCategoryData, sanitizeCategoryName } = require("../../helper/utils/adminUtils/categoryValidationUtils");
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategoryById,
  getCategoryStats
} = require("../../helper/services/adminServices/categoryService");



const categoryPage = async (req, res) => {
  try {
    const [categoryData, stats] = await Promise.all([
      getAllCategories(),
      getCategoryStats()
    ]);


    const { success, error } = req.query;
    let message = null;
    let messageType = null;

    if (success === 'true') {
      message = "Category operation completed successfully";
      messageType = "success";
    } else if (error === 'exists') {
      message = "Category already exists";
      messageType = "error";
    } else if (error === 'validation') {
      message = "Validation error occurred";
      messageType = "error";
    }

    res.render("categories", { 
      category: categoryData,
      stats,
      message,
      messageType
    });
  } catch (error) {
    console.error("Error loading categories:", error);
    res.status(500).render("categories", { 
      category: [],
      stats: { totalCategories: 0, activeCategories: 0, inactiveCategories: 0 },
      message: "Error loading categories",
      messageType: "error"
    });
  }
};

const categoryAdding = async (req, res) => {
  try {
    const { categoryName, description } = req.body;

 
    const errors = validateCategoryData(categoryName, description);
    if (errors.length > 0) {
      return res.redirect("/admin/categoryAdd?error=validation");
    }

   
    await createCategory(categoryName, description);
    res.redirect("/admin/categoryAdd?success=true");
  } catch (error) {
    console.error("Error adding category:", error.message);
    
    if (error.message === "Category already exists") {
      return res.redirect("/admin/categoryAdd?error=exists");
    }
    
    res.status(500).redirect("/admin/categoryAdd?error=server");
  }
};

const categoryBlocking = async (req, res) => {
  try {
    const categoryId = req.query.id;
    
    if (!categoryId) {
      return res.redirect("/admin/categoryAdd?error=invalid");
    }

    await toggleCategoryStatus(categoryId, false);
    res.redirect("/admin/categoryAdd?success=true");
  } catch (error) {
    console.error("Error blocking category:", error.message);
    res.redirect("/admin/categoryAdd?error=server");
  }
};

const categoryUnblocking = async (req, res) => {
  try {
    const categoryId = req.query.id;
    
    if (!categoryId) {
      return res.redirect("/admin/categoryAdd?error=invalid");
    }

    await toggleCategoryStatus(categoryId, true);
    res.redirect("/admin/categoryAdd?success=true");
  } catch (error) {
    console.error("Error unblocking category:", error.message);
    res.redirect("/admin/categoryAdd?error=server");
  }
};

const editCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    
    if (!categoryId) {
      return res.redirect("/admin/categoryAdd?error=invalid");
    }

    const category = await getCategoryById(categoryId);
    
    if (!category) {
      return res.redirect("/admin/categoryAdd?error=notfound");
    }

    req.session.categoryId = categoryId;
    res.render("editCategory", { category });
  } catch (error) {
    console.error("Error loading edit category page:", error);
    res.redirect("/admin/categoryAdd?error=server");
  }
};

const editingCategory = async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    const categoryId = req.session.categoryId;

    if (!categoryId) {
      return res.redirect("/admin/categoryAdd?error=session");
    }

 
    const errors = validateCategoryData(categoryName, description);
    if (errors.length > 0) {
      return res.redirect("/admin/categoryAdd?error=validation");
    }

    
    await updateCategory(categoryId, categoryName, description);
    
  
    delete req.session.categoryId;
    
    res.redirect("/admin/categoryAdd?success=true");
  } catch (error) {
    console.error("Error updating category:", error.message);
    
    if (error.message === "Category already exists") {
      return res.redirect("/admin/categoryAdd?error=exists");
    }
    
    res.redirect("/admin/categoryAdd?error=server");
  }
};


const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.query.id || req.params.id;
    
    if (!categoryId) {
      return res.status(400).json({ 
        success: false, 
        message: "Category ID is required" 
      });
    }

    const deletedCategory = await deleteCategoryById(categoryId);
    
    if (!deletedCategory) {
      return res.status(404).json({ 
        success: false, 
        message: "Category not found" 
      });
    }

    res.json({ 
      success: true, 
      message: "Category deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};


const getCategoryDetails = async (req, res) => {
  try {
    const categoryId = req.query.id || req.params.id;
    
    if (!categoryId) {
      return res.status(400).json({ 
        success: false, 
        message: "Category ID is required" 
      });
    }

    const category = await getCategoryById(categoryId);
    
    if (!category) {
      return res.status(404).json({ 
        success: false, 
        message: "Category not found" 
      });
    }

    res.json({ 
      success: true, 
      category 
    });
  } catch (error) {
    console.error("Error fetching category details:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};


const validateCategoryName = async (req, res) => {
  try {
    const { categoryName, excludeId } = req.body;
    
    if (!categoryName || categoryName.trim().length === 0) {
      return res.json({ 
        valid: false, 
        message: "Category name is required" 
      });
    }

    const sanitizedName = sanitizeCategoryName(categoryName);
    const exists = await checkCategoryExists(sanitizedName, excludeId);
    
    if (exists) {
      return res.json({ 
        valid: false, 
        message: "Category already exists" 
      });
    }

    const errors = validateCategoryData(categoryName, "dummy description");
    if (errors.length > 0) {
      return res.json({ 
        valid: false, 
        message: errors[0] 
      });
    }

    res.json({ 
      valid: true, 
      message: "Category name is available" 
    });
  } catch (error) {
    console.error("Error validating category name:", error);
    res.status(500).json({ 
      valid: false, 
      message: "Internal server error" 
    });
  }
};




module.exports = {

  categoryPage,
  categoryAdding,
  editCategory,
  editingCategory,
  categoryBlocking,
  categoryUnblocking,
  deleteCategory,
  getCategoryDetails,
  validateCategoryName,
};