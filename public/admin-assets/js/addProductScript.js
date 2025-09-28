    // Global variables
        let currentCropper = null;
        let currentImageIndex = -1;
        let croppedImages = [];
        let selectedFiles = [];

        // Toastr configuration
        toastr.options = {
            closeButton: true,
            debug: false,
            newestOnTop: false,
            progressBar: true,
            positionClass: "toast-top-right",
            preventDuplicates: false,
            showDuration: "300",
            hideDuration: "1000",
            timeOut: "5000",
            extendedTimeOut: "1000"
        };

        // Form submission handler
        document.addEventListener('DOMContentLoaded', function () {
            const form = document.getElementById('productAdd');

            form.addEventListener('submit', async function (event) {
                event.preventDefault();

                // Validate form before submission
                if (!validateForm()) {
                    return;
                }

                const formData = new FormData(form);

                try {
                    const response = await fetch('/admin/createProduct', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.errors) {
                        result.errors.forEach(error => {
                            toastr.error(error, 'Validation Error');
                        });
                        return;
                    }

                    if (response.ok) {
                        Swal.fire({
                            title: 'Success!',
                            text: 'Product added successfully!',
                            icon: 'success',
                            confirmButtonText: 'OK'
                        }).then(() => {
                            window.location.href = '/admin/productsView';
                        });
                    }
                } catch (error) {
                    console.error('Error:', error);
                    toastr.error('An error occurred while adding the product.');
                }
            });
        });

        // Form validation
        function validateForm() {
            const imageInput = document.getElementById('imageInput');
            
            if (imageInput.files.length < 5) {
                toastr.error('Please provide at least 5 images.');
                return false;
            }

            // Add other validations as needed
            return true;
        }

        // Image selection handler with improved functionality
        function handleImageSelection(event) {
            const files = Array.from(event.target.files);
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            const imageError = document.getElementById('imageError');

            // Clear previous error
            imageError.textContent = '';

            // Validate file count
            if (files.length > 5) {
                toastr.error('You can only select up to 5 images.');
                event.target.value = '';
                return;
            }

            if (files.length < 5) {
                toastr.warning('Please select at least 5 images.');
            }

            // Validate file types
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            for (let file of files) {
                if (!allowedTypes.includes(file.type)) {
                    imageError.textContent = 'Invalid file type. Only JPEG, JPG, PNG, and WebP are allowed.';
                    event.target.value = '';
                    return;
                }

                // Check file size (5MB limit)
                if (file.size > 5 * 1024 * 1024) {
                    toastr.error(`File "${file.name}" is too large. Maximum size is 5MB.`);
                    event.target.value = '';
                    return;
                }
            }

            // Store files globally
            selectedFiles = files;
            
            // Clear previous previews
            imagePreviewContainer.innerHTML = '';

            // Create previews for each file
            files.forEach((file, index) => {
                createImagePreview(file, index);
            });

            toastr.success(`${files.length} images selected successfully!`);
        }

        // Create image preview element
        function createImagePreview(file, index) {
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            
            const imagePreview = document.createElement('div');
            imagePreview.classList.add('image-preview');
            imagePreview.setAttribute('data-index', index);

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.alt = file.name;
            img.classList.add('img-thumbnail');

            const fileName = document.createElement('div');
            fileName.textContent = file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name;
            fileName.classList.add('file-name');

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('image-actions');

            // View/Crop button
            const cropButton = document.createElement('button');
            cropButton.classList.add('btn', 'btn-primary', 'btn-sm');
            cropButton.innerHTML = '<i class="fas fa-crop"></i> Crop';
            cropButton.type = 'button';
            cropButton.onclick = () => openCropModal(file, index);

            // Remove button
            const removeButton = document.createElement('button');
            removeButton.classList.add('btn', 'btn-danger', 'btn-sm');
            removeButton.innerHTML = '<i class="fas fa-trash"></i> Remove';
            removeButton.type = 'button';
            removeButton.onclick = () => removeImage(index);

            actionsDiv.appendChild(cropButton);
            actionsDiv.appendChild(removeButton);

            imagePreview.appendChild(img);
            imagePreview.appendChild(fileName);
            imagePreview.appendChild(actionsDiv);

            imagePreviewContainer.appendChild(imagePreview);
        }

        // Remove image from selection
        function removeImage(index) {
            const fileInput = document.getElementById('imageInput');
            const dt = new DataTransfer();
            
            // Remove file from selectedFiles array
            selectedFiles.splice(index, 1);
            
            // Update file input
            selectedFiles.forEach(file => dt.items.add(file));
            fileInput.files = dt.files;

            // Remove from cropped images if exists
            if (croppedImages[index]) {
                croppedImages.splice(index, 1);
            }

            // Refresh previews
            const imagePreviewContainer = document.getElementById('imagePreviewContainer');
            imagePreviewContainer.innerHTML = '';
            selectedFiles.forEach((file, newIndex) => {
                createImagePreview(file, newIndex);
            });

            toastr.info('Image removed successfully.');
        }

        // Open crop modal
        function openCropModal(file, index) {
            currentImageIndex = index;
            const modal = document.getElementById('cropModal');
            const image = document.getElementById('cropImage');
            
            image.src = URL.createObjectURL(file);
            modal.style.display = 'block';

            // Destroy existing cropper if any
            if (currentCropper) {
                currentCropper.destroy();
            }

            // Initialize new cropper
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
        }

        // Crop button click handler
        document.getElementById('btn-crop').addEventListener('click', function() {
            if (!currentCropper || currentImageIndex === -1) return;

            const canvas = currentCropper.getCroppedCanvas({
                width: 400,
                height: 400,
                minWidth: 256,
                minHeight: 256,
                maxWidth: 1024,
                maxHeight: 1024,
                fillColor: '#fff',
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            const croppedDataURL = canvas.toDataURL('image/jpeg', 0.9);
            const cropData = currentCropper.getData();

            // Store cropped image data
            croppedImages[currentImageIndex] = croppedDataURL;

            // Update the preview image
            const previewImg = document.querySelector(`[data-index="${currentImageIndex}"] .img-thumbnail`);
            if (previewImg) {
                previewImg.src = croppedDataURL;
            }

            // Store crop data in hidden field
            const hiddenField = document.getElementById(`hiddenField${currentImageIndex + 1}`);
            if (hiddenField) {
                hiddenField.value = JSON.stringify({
                    index: currentImageIndex,
                    x: Math.round(cropData.x),
                    y: Math.round(cropData.y),
                    width: Math.round(cropData.width),
                    height: Math.round(cropData.height)
                });
            }

            closeCropModal();
            toastr.success('Image cropped successfully!');
        });

        // Cancel crop button
        document.getElementById('btn-cancel').addEventListener('click', closeCropModal);

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('cropModal');
            if (event.target === modal) {
                closeCropModal();
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

                if (!validateInput(sizeInput, 'size') || !validateInput(quantityInput, 'quantity')) {
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