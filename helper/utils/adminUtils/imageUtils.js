const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs").promises;
const path = require("path");

const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const processImages = async (files, minImages = 5) => {
  const imagesStore = [];
  const errors = [];

  if (!files || files.length === 0) {
    errors.push("No images were uploaded.");
    return { success: false, errors };
  }

  let validImageCount = 0;

  for (const file of files) {
    if (!allowedImageTypes.includes(file.mimetype)) {
      errors.push(
        "One or more files have invalid type. Allowed types are: " +
        allowedImageTypes.join(", ")
      );
      break;
    }

    const filename = `${uuidv4()}.jpg`;
    const imagePath = path.join("Uploads", filename);
    const imageOutput = path.join(__dirname, "../../public", imagePath);

    try {
      await sharp(file.path)
        .resize({ width: 840, height: 840 })
        .toFile(imageOutput);

      imagesStore.push(imagePath.replace(/\\/g, "/"));
      validImageCount++;
    } catch (sharpError) {
      console.error("Sharp Error:", sharpError);
      errors.push("Error processing image.");
      break;
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  if (validImageCount < minImages) {
    errors.push(`Please provide at least ${minImages} images.`);
    return { success: false, errors };
  }

  return { success: true, images: imagesStore };
};

const updateProductImages = async (files, existingImages) => {
  const errors = [];
  let imagesStore = [...existingImages];

  if (files && files.length > 0) {
    for (const file of files) {
      if (!allowedImageTypes.includes(file.mimetype)) {
        errors.push(
          `Invalid file type for image. Allowed types are: ${allowedImageTypes.join(", ")}`
        );
        break;
      }

      const filename = `${uuidv4()}.jpg`;
      const imagePath = path.join("Uploads", filename);
      const imageOutput = path.join(__dirname, "../../public", imagePath);

      try {
        await sharp(file.path)
          .resize({ width: 840, height: 840 })
          .toFile(imageOutput);

        imagesStore.push(imagePath.replace(/\\/g, "/"));
      } catch (sharpError) {
        console.error("Error processing image with Sharp:", sharpError);
        errors.push("Error processing image.");
        break;
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  if (imagesStore.length < 5) {
    errors.push("Please provide at least 5 images.");
    return { success: false, errors };
  }

  return { success: true, images: imagesStore };
};

module.exports = { processImages, updateProductImages, allowedImageTypes };