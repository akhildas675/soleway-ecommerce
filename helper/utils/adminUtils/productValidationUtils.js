const mongoose = require("mongoose");

const validateProductData = (data) => {
  const { productName, description, realPrice, brandName, category, offerId } = data;
  const errors = [];

  if (!productName || productName.trim().length === 0) {
    errors.push("Please enter a valid product name");
  }

  if (!description || description.trim().length === 0) {
    errors.push("Description cannot be empty");
  } else if (description.length > 150) {
    errors.push("Description cannot exceed 150 characters");
  }

  if (!/^[1-9][0-9]*(\.[0-9]+)?$/.test(realPrice)) {
    errors.push("Please enter a valid price");
  }

  if (!brandName) {
    errors.push("Please enter a valid Brand name");
  }

  if (!mongoose.Types.ObjectId.isValid(category)) {
    errors.push("Invalid category");
  }

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    errors.push("Invalid offer");
  }

  return errors;
};

const validateSizes = (body) => {
  const sizes = [];
  const errors = [];

  for (const key in body) {
    if (key.startsWith("size") && body[key]) {
      const size = body[key];
      const quantityKey = key.replace("size", "quantity");
      const quantity = body[quantityKey];

      const existingSize = sizes.find((s) => s.size === size);

      if (existingSize) {
        errors.push(`Size ${size} is already added.`);
      } else if (!quantity || isNaN(quantity) || parseInt(quantity) < 0) {
        errors.push(`Please enter a valid quantity for size ${size}`);
      } else if (size < 1 || size > 15 || isNaN(size)) {
        errors.push(`Size ${size} must be between 1 and 15`);
      } else {
        sizes.push({ size, quantity: parseInt(quantity) });
      }
    }
  }

  if (sizes.length === 0) {
    errors.push("At least one size and quantity must be provided.");
  }

  return { sizes, errors };
};

const validateOfferData = (data) => {
  const { offerName, offerPercentage } = data;
  const errors = [];
  const percentage = Number(offerPercentage);

  if (!offerName || offerName.trim() === "") {
    errors.push("Please enter a valid Offer Name.");
  }

  if (
    percentage === undefined ||
    percentage === null ||
    isNaN(percentage) ||
    percentage < 0 ||
    percentage > 70
  ) {
    errors.push("Please enter a valid discount percentage between 0 and 70.");
  }

  return { errors, percentage };
};

module.exports = { validateProductData, validateSizes, validateOfferData };