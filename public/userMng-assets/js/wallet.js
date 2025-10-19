 async function addToWallet() {
            const amount = document.getElementById('add-amount').value;

            if (!amount || isNaN(amount) || amount <= 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Invalid Amount',
                    text: 'Please enter a valid amount to add.',
                    confirmButtonColor: '#10b981'
                });
                return;
            }

            try {
                const response = await fetch('/addToWallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: parseFloat(amount) }),
                });

                const order = await response.json();
                if (!order || !order.id) {
                    throw new Error('Failed to create order');
                }

                const options = {
                    key: 'rzp_test_72sGbnDINNYlKN',
                    amount: amount * 100,
                    currency: 'INR',
                    name: 'Soleway',
                    description: 'Add Money to Wallet',
                    order_id: order.id,
                    theme: { color: '#10b981' },
                    handler: async function (response) {
                        try {
                            const result = await fetch('/walletPaymentSuccess', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    paymentId: response.razorpay_payment_id,
                                    orderId: response.razorpay_order_id,
                                    amount: amount,
                                }),
                            });

                            const data = await result.json();

                            if (data.success) {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Success!',
                                    text: 'Money successfully added to your wallet!',
                                    confirmButtonColor: '#10b981'
                                }).then(() => window.location.href = '/wallet');
                            } else {
                                throw new Error(data.message || 'Payment failed');
                            }
                        } catch (error) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: error.message || 'Something went wrong. Please try again.',
                                confirmButtonColor: '#ef4444'
                            });
                        }
                    },
                };

                const rzp = new Razorpay(options);
                rzp.open();
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to create the order. Please try again.',
                    confirmButtonColor: '#ef4444'
                });
            }
        }