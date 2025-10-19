
        // Block/Unblock Product Handler
        document.addEventListener('DOMContentLoaded', function() {
            const blockUnblockBtns = document.querySelectorAll('.block-unblock-btn');

            blockUnblockBtns.forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    const productId = this.getAttribute('data-product-id');
                    const isActive = this.getAttribute('data-is-active') === 'true';
                    const btn = this;

                    // Disable button during request
                    btn.disabled = true;

                    const endpoint = isActive 
                        ? `/admin/productBlock?id=${productId}`
                        : `/admin/productUnblock?id=${productId}`;

                    const action = isActive ? 'Block' : 'Unblock';

                    fetch(endpoint, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    })
                    .then(response => {
                        if (response.ok) {
                            // Toggle the state
                            const newState = !isActive;
                            btn.setAttribute('data-is-active', newState);
                            
                            // Update button text and class
                            if (newState) {
                                btn.textContent = 'Block';
                                btn.classList.remove('btn-success');
                                btn.classList.add('btn-warning');
                            } else {
                                btn.textContent = 'Unblock';
                                btn.classList.remove('btn-warning');
                                btn.classList.add('btn-success');
                            }

                            // Update status badge
                            const statusElement = document.getElementById(`product-status-${productId}`);
                            if (statusElement) {
                                if (newState) {
                                    statusElement.textContent = 'Status: Active';
                                    statusElement.classList.remove('inactive');
                                    statusElement.classList.add('active');
                                } else {
                                    statusElement.textContent = 'Status: Inactive';
                                    statusElement.classList.remove('active');
                                    statusElement.classList.add('inactive');
                                }
                            }

                            // Show success message
                            Swal.fire({
                                icon: 'success',
                                title: 'Success!',
                                text: `Product ${action.toLowerCase()}ed successfully`,
                                timer: 1500,
                                showConfirmButton: false,
                            });

                            // Re-enable button
                            btn.disabled = false;
                        } else {
                            throw new Error('Request failed');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        
                        Swal.fire({
                            icon: 'error',
                            title: 'Error!',
                            text: `Failed to ${action.toLowerCase()} product. Please try again.`,
                        });

                        // Re-enable button
                        btn.disabled = false;
                    });
                });
            });
        });

        // Delete Product Handler (existing code)
        async function deleteProduct(productId) {
            try {
                const result = await Swal.fire({
                    title: 'Are you sure?',
                    text: "You won't be able to revert this!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes, delete it!'
                });

                if (result.isConfirmed) {
                    const response = await fetch(`/admin/deleteProduct/${productId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Product has been deleted.',
                            timer: 2000,
                            showConfirmButton: false,
                        }).then(() => {
                            location.reload();
                        });
                    } else {
                        const errorData = await response.json();
                        Swal.fire({
                            icon: 'error',
                            title: 'Error!',
                            text: `Failed to delete product: ${errorData.message}`,
                        });
                    }
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error!',
                    text: 'An error occurred while deleting the product.',
                });
            }
        }
