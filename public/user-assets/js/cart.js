function calculateTotal() {
    const rows = document.querySelectorAll('.table_row');
    let totalAmount = 0;

    rows.forEach(row => {
        const quantityInput = row.querySelector('.num-product');
        if (quantityInput) {
            const price = parseFloat(quantityInput.dataset.price);
            const quantity = parseInt(quantityInput.value);
            const totalPrice = quantity * price;

            // Update the total price for each row
            const totalPriceElement = row.querySelector('.total-price');
            if (totalPriceElement) {
                totalPriceElement.textContent = `₹${totalPrice.toFixed(2)}`;
            }
            totalAmount += totalPrice;
        }
    });

    // Update the total amount
    const totalAmountElement = document.getElementById('total-amount');
    if (totalAmountElement) {
        totalAmountElement.textContent = totalAmount.toFixed(2);
    }

    return totalAmount;
}

// Decrease quantity function
function decreaseQuantity(element) {
    const wrapDiv = element.closest('.wrap-num-product');
    const input = wrapDiv.querySelector('.num-product');
    let numProduct = Number(input.value);

    if (numProduct > 1) {
        input.value = --numProduct;
        updateCartAndTotal(input);
    }
}

// Increase quantity function
function increaseQuantity(element) {
    const wrapDiv = element.closest('.wrap-num-product');
    const input = wrapDiv.querySelector('.num-product');
    let numProduct = Number(input.value);
    const maxProduct = parseInt(input.getAttribute('max'));

    if (numProduct < maxProduct) {
        input.value = ++numProduct;
        updateCartAndTotal(input);
    } else {
        swal({
            title: "Maximum Limit Reached",
            text: "You can only add up to " + maxProduct + " items of this product.",
            icon: "warning",
            button: "OK",
        });
    }
}

// Update cart and calculate total
function updateCartAndTotal(input) {
    const quantity = Number(input.value);
    const price = Number(input.dataset.price);
    const total = quantity * price;

    // Update the row total
    const tableRow = input.closest('.table_row');
    const totalPriceElement = tableRow.querySelector('.total-price');
    if (totalPriceElement) {
        totalPriceElement.textContent = '₹' + total.toFixed(2);
    }

    // Calculate the new total amount
    const totalAmount = calculateTotal();

    // Update the cart with the new total amount
    updateCart(input, totalAmount);
}

// Update cart via API
function updateCart(input, totalAmount) {
    const productId = input.dataset.productId;
    const sizeId = input.dataset.sizesId;
    const quantity = Number(input.value);

    // Show loading state
    input.disabled = true;
    const tableRow = input.closest('.table_row');
    tableRow.classList.add('loading');

    fetch('/updateCart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            productId: productId,
            sizeId: sizeId,
            quantity: quantity,
            totalAmount: totalAmount
        }),
    })
    .then(response => response.json())
    .then(data => {
        // Remove loading state
        input.disabled = false;
        tableRow.classList.remove('loading');
        
        if (data.success) {
            console.log('Cart updated successfully');
            showUpdateFeedback(input, 'success');
        } else {
            console.error('Failed to update cart:', data.message);
            swal({
                title: "Error!",
                text: data.message,
                icon: "error",
                button: "OK",
            });
            location.reload();
        }
    })
    .catch(error => {
        // Remove loading state
        input.disabled = false;
        tableRow.classList.remove('loading');
        console.error('Error updating cart:', error);
        swal({
            title: "Error!",
            text: "There was an error updating the cart. Please try again.",
            icon: "error",
            button: "Retry",
        });
    });
}

// Show visual feedback for successful update
// Remove or modify this part in your showUpdateFeedback function
function showUpdateFeedback(input, type) {
    const row = input.closest('.table_row');
    const originalClass = row.className;
    
    if (type === 'success') {
        // Comment out or change this line:
        // row.classList.add('table-success');
        row.style.backgroundColor = '#e3f2fd'; 
        setTimeout(() => {
            row.style.backgroundColor = '';
        }, 1000);
    }
}

// Handle manual input changes
function handleQuantityChange(input) {
    const minQuantity = parseInt(input.getAttribute('min')) || 1;
    const maxQuantity = parseInt(input.getAttribute('max')) || 10;
    let quantity = parseInt(input.value);

    // Validate quantity
    if (isNaN(quantity) || quantity < minQuantity) {
        input.value = minQuantity;
        quantity = minQuantity;
    } else if (quantity > maxQuantity) {
        input.value = maxQuantity;
        quantity = maxQuantity;
        swal({
            title: "Maximum Limit Reached",
            text: "You can only add up to " + maxQuantity + " items of this product.",
            icon: "warning",
            button: "OK",
        });
    }

    updateCartAndTotal(input);
}

// Delete cart item function
function deleteCartItem(index) {
    const idElement = document.getElementById('productId' + index);
    if (!idElement) {
        console.error('Product ID element not found');
        return;
    }
    
    const id = idElement.value;

    swal({
        title: "Are you sure?",
        text: "Once deleted, you will not be able to recover this item!",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
    .then((willDelete) => {
        if (willDelete) {
            fetch('/deleteCartItem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    swal("Item has been deleted!", {
                        icon: "success",
                    }).then(() => {
                        // Remove the row from DOM instead of reloading
                        const row = idElement.closest('.table_row');
                        if (row) {
                            row.style.opacity = '0.5';
                            setTimeout(() => {
                                row.remove();
                                calculateTotal();
                                
                                // Check if cart is empty
                                const remainingRows = document.querySelectorAll('.table_row');
                                if (remainingRows.length === 0) {
                                    location.reload(); // Reload to show empty cart message
                                }
                            }, 300);
                        }
                    });
                } else {
                    swal("Failed to delete item!", data.message, "error");
                }
            })
            .catch(error => {
                console.error("Error deleting item:", error);
                swal("Error!", "An error occurred while deleting the item.", "error");
            });
        } else {
            swal("Your item is safe!");
        }
    });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners to all quantity inputs
    const quantityInputs = document.querySelectorAll('.num-product');
    quantityInputs.forEach(input => {
        input.addEventListener('change', function() {
            handleQuantityChange(this);
        });
        
        input.addEventListener('blur', function() {
            handleQuantityChange(this);
        });
    });

    // Calculate initial total
    calculateTotal();
    
    console.log('Cart functionality initialized');
});

// Alternative initialization if DOMContentLoaded doesn't work
window.onload = function() {
    if (!document.querySelector('.num-product[data-initialized]')) {
        const quantityInputs = document.querySelectorAll('.num-product');
        quantityInputs.forEach(input => {
            input.setAttribute('data-initialized', 'true');
            input.addEventListener('change', function() {
                handleQuantityChange(this);
            });
        });
        calculateTotal();
    }
};