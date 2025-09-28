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

//   
const ensureDirectoryExists = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

//  Cleanup 
const cleanupTempFile = async (filePath) => {
  try {
    if (filePath) {
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.log(`Could not delete temp file ${filePath}:`, error.message);
  }
};

// add new images
const processImages = async (files, minImages = 5) => {
  const imagesStore = [];
  const errors = [];
  const tempFilesToCleanup = [];

  try {
    if (!files || files.length === 0) {
      errors.push("No images were uploaded.");
      return { success: false, errors };
    }

    const uploadsDir = path.join(__dirname, "../../../public/Uploads");
    await ensureDirectoryExists(uploadsDir);

    let validImageCount = 0;

    for (const file of files) {
      tempFilesToCleanup.push(file.path);

      if (!allowedImageTypes.includes(file.mimetype)) {
        errors.push(
          `Invalid file type: ${file.mimetype}. Allowed types are: ${allowedImageTypes.join(", ")}`
        );
        break;
      }

      try {
        await fs.access(file.path);
      } catch {
        console.error(`Temp file not found: ${file.path}`);
        errors.push("Uploaded file not found. Please try again.");
        break;
      }

      const filename = `${uuidv4()}.jpg`;
      const imagePath = path.join("Uploads", filename);
      const imageOutput = path.join(uploadsDir, filename);

      try {
        await sharp(file.path)
          .resize({ width: 840, height: 840, fit: "cover" })
          .jpeg({ quality: 85 })
          .toFile(imageOutput);

        await fs.access(imageOutput);

        imagesStore.push(imagePath.replace(/\\/g, "/"));
        validImageCount++;
        console.log(` Processed image: ${filename}`);
      } catch (sharpError) {
        console.error("Sharp Error:", sharpError);
        errors.push(`Error processing image ${file.originalname || "unknown"}: ${sharpError.message}`);
        break;
      }
    }

    if (errors.length > 0) return { success: false, errors };
    if (validImageCount < minImages) {
      errors.push(`Please provide at least ${minImages} images. You provided ${validImageCount}.`);
      return { success: false, errors };
    }

    return { success: true, images: imagesStore };
  } catch (error) {
    console.error("Error in processImages:", error);
    errors.push("Failed to process images. Please try again.");
    return { success: false, errors };
  } finally {
    for (const tempFile of tempFilesToCleanup) {
      await cleanupTempFile(tempFile);
    }
  }
};

// update product images 
const updateProductImages = async (files, existingImages = []) => {
  const errors = [];
  let imagesStore = [...existingImages];
  const tempFilesToCleanup = [];

  try {
    if (!files || files.length === 0) {
      if (imagesStore.length < 5) {
        errors.push(`Please provide at least 5 images. Current count: ${imagesStore.length}`);
        return { success: false, errors };
      }
      return { success: true, images: imagesStore };
    }

    const uploadsDir = path.join(__dirname, "../../../public/Uploads");
    await ensureDirectoryExists(uploadsDir);

    for (const file of files) {
      tempFilesToCleanup.push(file.path);

      if (!allowedImageTypes.includes(file.mimetype)) {
        errors.push(
          `Invalid file type: ${file.mimetype}. Allowed types are: ${allowedImageTypes.join(", ")}`
        );
        break;
      }

      try {
        await fs.access(file.path);
      } catch {
        console.error(`Temp file not found: ${file.path}`);
        errors.push("Uploaded file not found. Please try again.");
        break;
      }

      const filename = `${uuidv4()}.jpg`;
      const imagePath = path.join("Uploads", filename);
      const imageOutput = path.join(uploadsDir, filename);

      try {
        await sharp(file.path)
          .resize({ width: 840, height: 840, fit: "cover" })
          .jpeg({ quality: 85 })
          .toFile(imageOutput);

        await fs.access(imageOutput);

        imagesStore.push(imagePath.replace(/\\/g, "/"));
        console.log(` Added new image: ${filename}`);
      } catch (sharpError) {
        console.error("Error processing image with Sharp:", sharpError);
        errors.push(`Error processing image ${file.originalname || "unknown"}: ${sharpError.message}`);
        break;
      }
    }

    if (errors.length > 0) return { success: false, errors };
    if (imagesStore.length < 5) {
      errors.push(`Please provide at least 5 images. Current count: ${imagesStore.length}`);
      return { success: false, errors };
    }

    return { success: true, images: imagesStore };
  } catch (error) {
    console.error("Error in updateProductImages:", error);
    errors.push("Failed to update product images. Please try again.");
    return { success: false, errors };
  } finally {
    for (const tempFile of tempFilesToCleanup) {
      await cleanupTempFile(tempFile);
    }
  }
};

// Remove 
const removeProductImage = async (imagePath) => {
  try {
    const uploadsDir = path.join(__dirname, "../../../public");
    const fullPath = path.join(uploadsDir, imagePath);

    await fs.unlink(fullPath);
    console.log(`Deleted image: ${imagePath}`);
    return true;
  } catch (error) {
    console.error(`Error deleting image ${imagePath}:`, error);
    return false;
  }
};

//   Validate e
const validateImageFile = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  processImages,
  updateProductImages,
  removeProductImage,
  validateImageFile,
  allowedImageTypes,
};
