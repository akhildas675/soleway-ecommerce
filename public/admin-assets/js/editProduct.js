

// Global variables for image handling
let currentCropper = null;
let currentImageIndex = -1;
let currentImageType = 'existing';
let newImageFiles = [];
let croppedImages = [];
let removedImageIndices = new Set();

// Initialize toastr options
toastr.options = {
    "closeButton": true,
    "debug": false,
    "newestOnTop": false,
    "progressBar": true,
    "positionClass": "toast-top-right",
    "preventDuplicates": false,
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "5000",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
};

// Fixed existing image removal function
function removeExistingImage(imageIndex) {
    const productId = document.getElementById('productId').value;
    
    if (!productId) {
        toastr.error('Product ID not found. Please refresh the page.');
        return;
    }

    // Show confirmation dialog
    Swal.fire({
        title: 'Are you sure?',
        text: 'This will permanently delete the image.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            // Show loading state
            Swal.fire({
                title: 'Deleting...',
                text: 'Please wait while we remove the image.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Make the deletion request
            fetch('/admin/removeImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    index: parseInt(imageIndex),
                    productId: productId
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                Swal.close(); // Close loading dialog
                
                if (data.success) {
                    // Remove the image container from DOM
                    const imageContainer = document.querySelector(`[data-existing-index="${imageIndex}"]`);
                    if (imageContainer) {
                        imageContainer.remove();
                        removedImageIndices.add(parseInt(imageIndex));
                    }
                    
                    // Update indices of remaining images
                    updateImageIndices();
                    
                    // Show success message
                    toastr.success(data.message || "Image removed successfully");
                    
                    // Check if we still have enough images
                    const remainingImages = document.querySelectorAll('[data-existing-index]').length;
                    const newImages = document.querySelectorAll('[data-new-index]').length;
                    const totalImages = remainingImages + newImages;
                    
                    if (totalImages < 5) {
                        toastr.warning(`You now have ${totalImages} images. Please add more images to meet the minimum requirement of 5 images.`);
                    }
                } else {
                    toastr.error(data.message || "Failed to remove image");
                }
            })
            .catch(error => {
                Swal.close(); 
                console.error('Error removing image:', error);
                toastr.error("An error occurred while removing the image. Please try again.");
            });
        }
    });
}


function updateImageIndices() {
    const existingImages = document.querySelectorAll('[data-existing-index]');
    existingImages.forEach((container, newIndex) => {
        // Update data attribute
        container.setAttribute('data-existing-index', newIndex);
        
        // Update remove button onclick
        const removeBtn = container.querySelector('.remove-image');
        if (removeBtn) {
            removeBtn.setAttribute('data-index', newIndex);
            removeBtn.setAttribute('onclick', `removeExistingImage('${newIndex}')`);
        }
        
        // Update crop button onclick
        const cropBtn = container.querySelector('.crop-image');
        if (cropBtn && container.querySelector('img')) {
            const imageSrc = container.querySelector('img').src;
            cropBtn.setAttribute('onclick', `cropExistingImage('${newIndex}', '${imageSrc}')`);
        }
    });
}

// Handle new image selection with better validation
function handleImageSelection(event) {
    const files = Array.from(event.target.files);
    
    // Get current image counts
    const existingImageCount = document.querySelectorAll('[data-existing-index]').length;
    const currentNewImageCount = document.querySelectorAll('[data-new-index]').length;
    const totalCurrentImages = existingImageCount + currentNewImageCount;
    
    // Check if adding these files would exceed limits
    if (totalCurrentImages + files.length > 10) {
        toastr.error(`Cannot add ${files.length} images. Maximum total images allowed is 10. You currently have ${totalCurrentImages} images.`);
        event.target.value = '';
        return;
    }
    
    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    
    for (let file of files) {
        if (!allowedTypes.includes(file.type)) {
            toastr.error(`Invalid file type for "${file.name}". Only JPEG, JPG, PNG, and WebP are allowed.`);
            event.target.value = '';
            return;
        }
        
        if (file.size > maxFileSize) {
            toastr.error(`File "${file.name}" is too large. Maximum file size is 5MB.`);
            event.target.value = '';
            return;
        }
    }

    // Add new files to existing array
    newImageFiles = [...newImageFiles, ...files];
    displayNewImagePreviews(newImageFiles);
    
    toastr.success(`Added ${files.length} new image(s) successfully.`);
}

// Display new image previews
function displayNewImagePreviews(files) {
    const container = document.getElementById('newImagePreview');
    container.innerHTML = '';

    files.forEach((file, index) => {
        const previewDiv = createNewImagePreview(file, index);
        container.appendChild(previewDiv);
    });
}

// Create new image preview with better error handling
function createNewImagePreview(file, index) {
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview';
    previewDiv.setAttribute('data-new-index', index);

    const img = document.createElement('img');
    img.className = 'img-thumbnail';
    img.alt = file.name;
    
    // Create object URL with error handling
    try {
        img.src = URL.createObjectURL(file);
    } catch (error) {
        console.error('Error creating object URL:', error);
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjBGMEYwIi8+Cjx0ZXh0IHg9IjMwIiB5PSIzNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1zaXplPSIxMiI+RXJyb3I8L3RleHQ+Cjwvc3ZnPg==';
    }

    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name;

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.className = 'remove-image';
    removeBtn.type = 'button';
    removeBtn.onclick = () => removeNewImage(index);

    const cropBtn = document.createElement('button');
    cropBtn.textContent = 'Crop';
    cropBtn.className = 'crop-image';
    cropBtn.type = 'button';
    cropBtn.onclick = () => cropNewImage(index, file);

    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View';
    viewBtn.className = 'view-image';
    viewBtn.type = 'button';
    viewBtn.onclick = () => {
        try {
            viewImage(URL.createObjectURL(file));
        } catch (error) {
            toastr.error('Cannot view this image');
        }
    };

    previewDiv.appendChild(removeBtn);
    previewDiv.appendChild(img);
    previewDiv.appendChild(fileName);
    previewDiv.appendChild(cropBtn);
    previewDiv.appendChild(viewBtn);

    return previewDiv;
}

// Remove new image
function removeNewImage(index) {
    // Remove from files array
    newImageFiles.splice(index, 1);
    
    // Remove from cropped images if exists
    if (croppedImages[index]) {
        croppedImages.splice(index, 1);
    }
    
    // Update file input
    const dt = new DataTransfer();
    newImageFiles.forEach(file => dt.items.add(file));
    document.getElementById('imageInput').files = dt.files;
    
    // Refresh display
    displayNewImagePreviews(newImageFiles);
    toastr.info('New image removed successfully.');
}

// Enhanced form validation before submission
function validateFormBeforeSubmit() {
    const existingImageCount = document.querySelectorAll('[data-existing-index]').length;
    const newImageCount = document.querySelectorAll('[data-new-index]').length;
    const totalImageCount = existingImageCount + newImageCount;
    
    if (totalImageCount < 5) {
        toastr.error(`Product must have at least 5 images. You currently have ${totalImageCount} images.`);
        return false;
    }
    
    return validatePage(); // Your existing validation function
}

// Enhanced form submission handling
document.getElementById('productAdd').addEventListener('submit', function (event) {
    event.preventDefault(); // Always prevent default first
    
    if (!validateFormBeforeSubmit()) {
        return false;
    }
    
    // Show loading state
    Swal.fire({
        title: 'Updating Product...',
        text: 'Please wait while we update your product.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    // Submit the form
    this.submit();
});

// Crop existing image function
function cropExistingImage(index, imageSrc) {
    currentImageIndex = index;
    currentImageType = 'existing';
    openCropModal(imageSrc);
}

// View image function
function viewImage(imageSrc) {
    const modal = document.getElementById('viewModal');
    const image = document.getElementById('viewImage');
    image.src = imageSrc;
    modal.style.display = 'block';
}

// Close view modal
function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

// Crop new image
function cropNewImage(index, file) {
    currentImageIndex = index;
    currentImageType = 'new';
    try {
        openCropModal(URL.createObjectURL(file));
    } catch (error) {
        toastr.error('Cannot crop this image');
    }
}

// Open crop modal (keep existing function)
function openCropModal(imageSrc) {
    const modal = document.getElementById('cropModal');
    const image = document.getElementById('cropImage');
    
    image.src = imageSrc;
    modal.style.display = 'block';

    if (currentCropper) {
        currentCropper.destroy();
    }

    image.onload = function() {
        currentCropper = new Cropper(image, {
            aspectRatio: 1,
            viewMode: 2,
            dragMode: 'move',
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
        });
    };
}

// Close crop modal
function closeCropModal() {
    const modal = document.getElementById('cropModal');
    modal.style.display = 'none';
    
    if (currentCropper) {
        currentCropper.destroy();
        currentCropper = null;
    }
    
    currentImageIndex = -1;
    currentImageType = 'existing';
}

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('update') === 'success') {
        Toastify({
            text: "Product updated successfully!",
            duration: 5000,
            gravity: "top",
            position: "center",
            backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            stopOnFocus: true,
        }).showToast();
    }

    // Crop button event
    document.getElementById('btn-crop').addEventListener('click', function() {
        if (!currentCropper) return;

        const canvas = currentCropper.getCroppedCanvas({
            width: 400,
            height: 400,
            minWidth: 256,
            minHeight: 256,
            maxWidth: 1024,
            maxHeight: 1024,
            fillColor: '#fff',
            imageSmoothingEnabled: false,
            imageSmoothingQuality: 'high',
        });

        const croppedDataURL = canvas.toDataURL('image/jpeg', 0.9);
        const cropData = currentCropper.getData();

        // Store cropped data
        croppedImages[currentImageIndex] = {
            dataURL: croppedDataURL,
            cropData: cropData,
            type: currentImageType
        };

        // Update preview image
        let previewImg;
        if (currentImageType === 'existing') {
            previewImg = document.querySelector(`[data-existing-index="${currentImageIndex}"] .preview-image`);
        } else {
            previewImg = document.querySelector(`[data-new-index="${currentImageIndex}"] .img-thumbnail`);
        }
        
        if (previewImg) {
            previewImg.src = croppedDataURL;
        }

        // Update hidden field
        const hiddenField = document.getElementById(`hiddenField${currentImageIndex + 1}`);
        if (hiddenField) {
            hiddenField.value = JSON.stringify({
                index: currentImageIndex,
                type: currentImageType,
                x: cropData.x,
                y: cropData.y,
                width: cropData.width,
                height: cropData.height
            });
        }

        closeCropModal();
        toastr.success('Image cropped successfully!');
    });

    // Cancel crop button
    document.getElementById('btn-cancel').addEventListener('click', closeCropModal);
});

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const cropModal = document.getElementById('cropModal');
    const viewModal = document.getElementById('viewModal');
    
    if (event.target === cropModal) {
        closeCropModal();
    }
    if (event.target === viewModal) {
        closeViewModal();
    }
});

// Size and Quantity Management
let sizeCounter = 8;
const maxFields = 6;

document.getElementById('addSizeQuantityBtn').addEventListener('click', function () {
    const container = document.getElementById('sizeQuantityContainer');
    const rows = container.getElementsByTagName('tr');
    
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const sizeInput = lastRow.querySelector('input[name^="size"]');
        const quantityInput = lastRow.querySelector('input[name^="quantity"]');

        const isSizeValid = validateInput(sizeInput, 'size');
        const isQuantityValid = validateInput(quantityInput, 'quantity');

        if (!isSizeValid || !isQuantityValid) {
            toastr.error('Please fill out the current row correctly before adding a new one.');
            return;
        }
    }

    if (rows.length >= maxFields) {
        toastr.warning('Maximum of 6 size and quantity rows reached.');
        return;
    }

    const newRow = createSizeQuantityRow(sizeCounter);
    container.appendChild(newRow);
    sizeCounter++;
});

function createSizeQuantityRow(counter) {
    const newRow = document.createElement('tr');
    newRow.id = `row${counter}`;

    newRow.innerHTML = `
        <td>
            <input type="text" placeholder="Size" class="form-control small-input" 
                   id="size${counter}" name="size${counter}" 
                   oninput="validateInput(this, 'size')">
            <div id="size${counter}Error" class="error" style="color: red;"></div>
        </td>
        <td>
            <input type="text" placeholder="Quantity" class="form-control small-input" 
                   id="quantity${counter}" name="quantity${counter}" 
                   oninput="validateInput(this, 'quantity')">
            <div id="quantity${counter}Error" class="error" style="color: red;"></div>
        </td>
        <td>
            <button type="button" class="btn btn-danger btn-sm" 
                    onclick="removeRow('row${counter}')">Remove</button>
        </td>
    `;

    return newRow;
}

function removeRow(rowId) {
    const container = document.getElementById('sizeQuantityContainer');
    if (container.getElementsByTagName('tr').length > 1) {
        document.getElementById(rowId).remove();
        toastr.info('Row removed successfully.');
    } else {
        toastr.warning('At least one size and quantity row is required.');
    }
}

function validateInput(input, type) {
    const errorDiv = document.getElementById(`${input.id}Error`);
    const value = input.value.trim();

    if (type === 'size') {
        if (value === '' || isNaN(value) || parseFloat(value) <= 4 || parseFloat(value) > 15) {
            errorDiv.textContent = 'Please enter a valid size (5-15).';
            return false;
        }
    } else if (type === 'quantity') {
        if (value === '' || isNaN(value) || parseFloat(value) < 0) {
            errorDiv.textContent = 'Please enter a valid positive number.';
            return false;
        }
    }

    errorDiv.textContent = '';
    return true;
}

// Form validation
function validatePage() {
    const productName = document.querySelector('input[name="productName"]').value.trim();
    const description = document.querySelector('textarea[name="description"]').value.trim();
    const realPrice = document.querySelector('input[name="realPrice"]').value.trim();
    const category = document.querySelector('select[name="category"]').value.trim();

    const productNameError = document.getElementById('productNameError');
    const descriptionError = document.getElementById('descriptionError');
    const realPriceError = document.getElementById('realPriceError');
    const categoryError = document.getElementById('categoryError');

    let isValid = true;

    // Clear previous errors
    productNameError.textContent = '';
    descriptionError.textContent = '';
    realPriceError.textContent = '';
    categoryError.textContent = '';

    if (productName === '') {
        productNameError.textContent = 'Product name is required';
        isValid = false;
    }

    if (description === '') {
        descriptionError.textContent = 'Description is required';
        isValid = false;
    }

    if (realPrice === '') {
        realPriceError.textContent = 'Price is required';
        isValid = false;
    } else if (!/^[1-9][0-9]*(\.[0-9]+)?$/.test(realPrice)) {
        realPriceError.textContent = 'Enter a valid price';
        isValid = false;
    }

    if (category === '') {
        categoryError.textContent = 'Category is required';
        isValid = false;
    }

    // Clear error messages after 3 seconds
    setTimeout(() => {
        productNameError.textContent = '';
        descriptionError.textContent = '';
        realPriceError.textContent = '';
        categoryError.textContent = '';
    }, 3000);

    return isValid;
}                 
                       