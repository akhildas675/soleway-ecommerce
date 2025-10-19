 function confirmCancel(orderId) {
            Swal.fire({
                title: 'Are you sure?',
                text: "Do you really want to cancel this order?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#667eea',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Yes, cancel it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    document.getElementById('cancellationOrderId').value = orderId;
                    $('#cancellationModal').modal('show');
                }
            });
        }

        async function submitCancellationReason() {
            const cancellationReason = document.getElementById('cancellationReason').value;
            const orderId = document.getElementById('cancellationOrderId').value;

            if (cancellationReason.trim() === "") {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Please enter a cancellation reason.' });
                return;
            }

            try {
                const response = await fetch('/orderCancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        orderId: orderId, 
                        actionType: 'cancel',
                        cancellationReason: cancellationReason
                    })
                });

                const data = await response.json();

                if (data.orderStatus === 'Cancelled') {
                    Swal.fire({
                        title: 'Cancelled!',
                        text: 'Your order has been canceled successfully.',
                        icon: 'success',
                        confirmButtonColor: '#667eea'
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire('Error', data.message || 'Failed to cancel the order.', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'An error occurred while canceling the order.', 'error');
            }

            $('#cancellationModal').modal('hide');
            document.getElementById('cancellationReasonForm').reset();
        }

        function openReturnModal(orderId) {
            document.getElementById('orderId').value = orderId;
            $('#reasonModal').modal('show');
        }

        async function submitReturnReason() {
            const returnReason = document.getElementById('returnReason').value;
            const orderId = document.getElementById('orderId').value;

            if (returnReason.trim() === "") {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Please enter a return reason.' });
                return;
            }

            try {
                const response = await fetch('/returnOrder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, returnReason })
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    Swal.fire({ icon: 'success', title: 'Success', text: data.message });
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Unknown error' });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred.' });
            }

            $('#reasonModal').modal('hide');
            document.getElementById('returnReasonForm').reset();
        }

        async function rePayment(orderId) {
            try {
                const response = await fetch('/rePay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId })
                });
                const result = await response.json();

                if (result.success) {
                    const options = {
                        key: "rzp_test_72sGbnDINNYlKN",
                        amount: result.amount,
                        currency: "INR",
                        name: "SOLEWAY",
                        description: "Order Payment",
                        order_id: result.orderId,
                        handler: async function (response) {
                            const verifyResponse = await fetch('/rePay', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    orderId,
                                    paymentId: response.razorpay_payment_id
                                })
                            });
                            const verifyResult = await verifyResponse.json();

                            if (verifyResult.success) {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Payment Successful',
                                    text: 'Your payment was successful!',
                                    confirmButtonColor: '#667eea'
                                }).then(() => window.location.reload());
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Verification Failed',
                                    text: 'Payment verification failed. Please try again.'
                                });
                            }
                        },
                        theme: { color: "#667eea" }
                    };
                    const razorpay = new Razorpay(options);
                    razorpay.open();
                } else {
                    Swal.fire({ icon: 'error', title: 'Payment Failed', text: result.message });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred.' });
            }
        }