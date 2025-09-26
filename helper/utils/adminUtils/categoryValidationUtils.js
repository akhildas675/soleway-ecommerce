const validateCategoryData = (categoryName, description) => {
  const errors = [];

  if (!categoryName || categoryName.trim().length === 0) {
    errors.push("Category name is required");
  } else if (categoryName.trim().length < 2) {
    errors.push("Category name must be at least 2 characters long");
  } else if (categoryName.trim().length > 50) {
    errors.push("Category name cannot exceed 50 characters");
  }

  if (!description || description.trim().length === 0) {
    errors.push("Description is required");
  } else if (description.trim().length < 10) {
    errors.push("Description must be at least 10 characters long");
  } else if (description.trim().length > 200) {
    errors.push("Description cannot exceed 200 characters");
  }

  return errors;
};

const sanitizeCategoryName = (categoryName) => {
  return categoryName.trim();
};

module.exports = { validateCategoryData, sanitizeCategoryName };