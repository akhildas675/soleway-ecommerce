
        // Add Offer
        document.getElementById("addOffer").addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                offerName: document.getElementById('offer_name').value,
                offerPercentage: parseInt(document.getElementById('discount_percentage').value),
            };

            try {
                const response = await fetch('/admin/addOffer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();

                if (result.success) {
                    Toastify({
                        text: "Offer added successfully!",
                        duration: 2000,
                        gravity: "top",
                        position: "right",
                        backgroundColor: "#4CAF50",
                    }).showToast();
                    
                    document.getElementById("addOffer").reset();
                    setTimeout(() => location.reload(), 2000);
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

        // Event Delegation for all buttons
        document.getElementById('offerBody').addEventListener('click', async (e) => {
            
            // Edit Button Click
            if (e.target.classList.contains('edit-offer-btn')) {
                const offerId = e.target.getAttribute('data-offer-id');
                const editRow = document.querySelector(`.edit-form-row[data-offer-id="${offerId}"]`);
                editRow.classList.toggle('active');
            }

            // Cancel Button Click
            if (e.target.classList.contains('cancel-offer-btn')) {
                const editRow = e.target.closest('.edit-form-row');
                editRow.classList.remove('active');
            }

            // Save Button Click
            if (e.target.classList.contains('save-offer-btn')) {
                const editRow = e.target.closest('.edit-form-row');
                const offerId = editRow.getAttribute('data-offer-id');
                
                const data = {
                    offerId: offerId,
                    offerName: editRow.querySelector('.edit-name').value,
                    offerPercentage: parseInt(editRow.querySelector('.edit-percentage').value),
                };

                try {
                    const response = await fetch('/admin/updateOffer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    const result = await response.json();

                    if (result.success) {
                        const row = document.querySelector(`.offer-row[data-offer-id="${offerId}"]`);
                        row.querySelector('.offer-name').textContent = data.offerName;
                        row.querySelector('.offer-percentage').textContent = data.offerPercentage + '%';

                        editRow.classList.remove('active');

                        Toastify({
                            text: "Offer updated successfully!",
                            duration: 2000,
                            gravity: "top",
                            position: "right",
                            backgroundColor: "#4CAF50",
                        }).showToast();
                    } else {
                        Toastify({
                            text: result.message || "Error updating offer",
                            duration: 2000,
                            gravity: "top",
                            position: "right",
                            backgroundColor: "#FF0000",
                        }).showToast();
                    }
                } catch (error) {
                    console.error("Error:", error);
                }
            }

            // Delete Button Click
            if (e.target.classList.contains('delete-offer-btn')) {
                const offerId = e.target.getAttribute('data-offer-id');
                
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
                        const response = await fetch(`/admin/deleteOffer?id=${offerId}`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const result = await response.json();

                        if (result.success) {
                            document.querySelector(`.offer-row[data-offer-id="${offerId}"]`).remove();
                            document.querySelector(`.edit-form-row[data-offer-id="${offerId}"]`).remove();
                            
                            Toastify({
                                text: "Offer deleted successfully!",
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
