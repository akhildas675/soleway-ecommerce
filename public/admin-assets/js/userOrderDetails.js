 document.getElementById("orderStatusSelect").addEventListener("change", function () {
    const newStatus = this.value;
    const orderId = "<%= orderedData._id %>"; 

    if (newStatus !== "Change status") {
      // Ask for confirmation before updating the status
      Swal.fire({
        title: 'Are you sure?',
        text: `Do you want to update the order status to "${newStatus}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, update it!',
        cancelButtonText: 'No, keep it',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          // If the user confirms, proceed with the update
          fetch(`/admin/updateOrderStatus`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: orderId,
              newStatus: newStatus,
            }),
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Success notification
              Swal.fire({
                icon: 'success',
                title: 'Order status updated!',
                text: `The status has been successfully changed to "${newStatus}".`,
                showConfirmButton: false,
                timer: 2000
              }).then(() => {
                // Reload the page after success
                window.location.reload();
              });
            } else {
             
              Swal.fire({
                icon: 'error',
                title: 'Update failed',
                text: 'Failed to update order status. Please try again later.',
              });
            }
          })
          .catch(error => {
            console.error("Error updating order status:", error);
            
            Swal.fire({
              icon: 'error',
              title: 'An error occurred',
              text: 'Something went wrong. Please try again.',
            });
          });
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          
          Swal.fire({
            title: 'Cancelled',
            text: 'Order status was not changed.',
            icon: 'info',
            timer: 1500,
            showConfirmButton: false
          });
        }
      });
    }
  });