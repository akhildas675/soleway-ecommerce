
        let editingCouponId = null;

        // Form submission
        document.getElementById("couponForm").addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const couponId = document.getElementById('coupon-id').value;
            const data = {
                couponName: document.getElementById('coupon_name').value,
                couponCode: document.getElementById('coupon_code').value,
                minimumPurchase: document.getElementById('minimum_purchase').value,
                discountInPercentage: document.getElementById('discount_percentage').value,
                expiryDate: document.getElementById('expiry_date').value,
            };

            try {
                let endpoint, method;
                
                if (couponId) {
                    // Edit mode
                    data.couponId = couponId;
                    endpoint = '/admin/editCoupon';
                    method = 'POST';
                } else {
                    // Add mode
                    endpoint = '/admin/addCoupon';
                    method = 'POST';
                }

                const response = await fetch(endpoint, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();

                if (result.success) {
                    if (couponId) {
                        // Update table row
                        const row = document.querySelector(`.coupon-row[data-coupon-id="${couponId}"]`);
                        row.querySelector('.coupon-name').textContent = data.couponName;
                        row.querySelector('.coupon-code').textContent = data.couponCode;
                        row.querySelector('.coupon-min').textContent = data.minimumPurchase;
                        row.querySelector('.coupon-discount').textContent = data.discountInPercentage + '%';
                        row.querySelector('.coupon-date').textContent = new Date(data.expiryDate).toLocaleDateString();

                        Toastify({
                            text: "Coupon updated successfully!",
                            duration: 2000,
                            gravity: "top",
                            position: "right",
                            backgroundColor: "#4CAF50",
                        }).showToast();
                    } else {
                        Toastify({
                            text: "Coupon added successfully!",
                            duration: 2000,
                            gravity: "top",
                            position: "right",
                            backgroundColor: "#4CAF50",
                        }).showToast();
                        
                        setTimeout(() => location.reload(), 2000);
                    }
                    
                    // Reset form
                    resetForm();
                } else {
                    Toastify({
                        text: result.errors?.join(", ") || result.message,
                        duration: 2000,
                        gravity: "top",
                        position: "right",
                        backgroundColor: "#FF0000",
                    }).showToast();
                }
            } catch (error) {
                console.error("Error:", error);
            }
        });

        // Reset form to add mode
        function resetForm() {
            document.getElementById('coupon-id').value = '';
            document.getElementById("couponForm").reset();
            document.getElementById('submitBtn').textContent = 'Add Coupon';
            document.getElementById('cancelBtn').style.display = 'none';
            editingCouponId = null;
        }

        // Cancel edit
        document.getElementById('cancelBtn').addEventListener('click', resetForm);

        // Edit Button Click
        document.getElementById('couponBody').addEventListener('click', async (e) => {
            
            if (e.target.classList.contains('edit-coupon-btn')) {
                const couponId = e.target.getAttribute('data-coupon-id');
                const row = document.querySelector(`.coupon-row[data-coupon-id="${couponId}"]`);
                
                // Get data from table row attributes
                const couponName = row.getAttribute('data-name');
                const couponCode = row.getAttribute('data-code');
                const minimumPurchase = row.getAttribute('data-min');
                const discountInPercentage = row.getAttribute('data-discount');
                const expiryDate = row.getAttribute('data-date');
                
                // Populate form with coupon data
                document.getElementById('coupon-id').value = couponId;
                document.getElementById('coupon_name').value = couponName;
                document.getElementById('coupon_code').value = couponCode;
                document.getElementById('minimum_purchase').value = minimumPurchase;
                document.getElementById('discount_percentage').value = discountInPercentage;
                document.getElementById('expiry_date').value = expiryDate;
                
                // Update button labels
                document.getElementById('submitBtn').textContent = 'Update Coupon';
                document.getElementById('cancelBtn').style.display = 'block';
                
                // Scroll to form
                document.getElementById('couponForm').scrollIntoView({ behavior: 'smooth' });
            }

            // Block/Unblock Button Click
            if (e.target.classList.contains('block-unblock-coupon')) {
                const couponId = e.target.getAttribute('data-coupon-id');
                const isActive = e.target.classList.contains('btn-warning-block');
                const endpoint = isActive ? `/admin/blockCoupon?id=${couponId}` : `/admin/unblockCoupon?id=${couponId}`;

                try {
                    const response = await fetch(endpoint, { method: 'GET' });
                    const result = await response.json();

                    if (result.success) {
                        const row = document.querySelector(`.coupon-row[data-coupon-id="${couponId}"]`);
                        const statusBadge = row.querySelector('.coupon-status');
                        const btn = e.target;

                        if (isActive) {
                            statusBadge.textContent = 'Inactive';
                            statusBadge.classList.remove('alert-success');
                            statusBadge.classList.add('alert-danger');
                            btn.textContent = 'Unblock';
                            btn.classList.remove('btn-warning-block');
                            btn.classList.add('btn-success-unblock');
                        } else {
                            statusBadge.textContent = 'Active';
                            statusBadge.classList.remove('alert-danger');
                            statusBadge.classList.add('alert-success');
                            btn.textContent = 'Block';
                            btn.classList.remove('btn-success-unblock');
                            btn.classList.add('btn-warning-block');
                        }

                        Toastify({
                            text: isActive ? "Coupon blocked!" : "Coupon unblocked!",
                            duration: 2000,
                            gravity: "top",
                            position: "right",
                            backgroundColor: "#4CAF50",
                        }).showToast();
                    }
                } catch (error) {
                    console.error("Error:", error);
                }
            }

            // Delete Button Click
            if (e.target.classList.contains('delete-coupon-btn')) {
                const couponId = e.target.getAttribute('data-coupon-id');
                
                const { isConfirmed } = await Swal.fire({
                    title: 'Are you sure?',
                    text: "You won't be able to revert this!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, delete it!'
                });

                if (isConfirmed) {
                    try {
                        const response = await fetch('/admin/couponDelete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ couponId: couponId })
                        });
                        const result = await response.json();

                        if (result.success) {
                            document.querySelector(`.coupon-row[data-coupon-id="${couponId}"]`).remove();
                            
                            // Reset form if editing this coupon
                            if (document.getElementById('coupon-id').value === couponId) {
                                resetForm();
                            }
                            
                            Toastify({
                                text: "Coupon deleted successfully!",
                                duration: 2000,
                                gravity: "top",
                                position: "right",
                                backgroundColor: "#4CAF50",
                            }).showToast();
                        }
                    } catch (error) {
                        console.error("Error:", error);
                    }
                }
            }
        });
  