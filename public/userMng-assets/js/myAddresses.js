  function deleteAddress(addressId) {
            Swal.fire({
                title: 'Are you sure?',
                text: "Do you really want to delete this address?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ec4899',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('/deleteAddress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ addressId: addressId })
                    })
                    .then(response => {
                        if (response.ok) {
                            Swal.fire({
                                title: 'Deleted!',
                                text: 'The address has been deleted.',
                                icon: 'success',
                                confirmButtonColor: '#ec4899'
                            }).then(() => window.location.reload());
                        } else {
                            Swal.fire({
                                title: 'Failed!',
                                text: 'Failed to delete the address.',
                                icon: 'error',
                                confirmButtonColor: '#ef4444'
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        Swal.fire({
                            title: 'Error!',
                            text: 'An error occurred. Please try again.',
                            icon: 'error',
                            confirmButtonColor: '#ef4444'
                        });
                    });
                }
            });
        }