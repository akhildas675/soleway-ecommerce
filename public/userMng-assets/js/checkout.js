// Fixed checkout frontend JavaScript - Secure Payment Flow

let appliedCouponCode = null;
let originalGrandTotal = parseFloat(
  document.querySelector("#grandTotal").textContent
);

// Store the current discount amount
let currentDiscount = 0;

async function applyOrRemoveCoupon(couponCode, index) {
  const button = document.getElementById(`coupon-btn-${index}`);
  const grandTotalElement = document.querySelector("#grandTotal");

  if (button.disabled) {
    Swal.fire({
      icon: "info",
      title: "Coupon Already Applied",
      text: "Please remove the current coupon before applying another one.",
      confirmButtonText: "OK",
    });
    return;
  }

  if (appliedCouponCode === couponCode) {
    // Remove coupon
    try {
      const response = await fetch("/removeCoupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        // Reset to original total
        grandTotalElement.textContent = originalGrandTotal.toFixed(2);
        appliedCouponCode = null;
        currentDiscount = 0;

        // Enable all coupon buttons
        const buttons = document.querySelectorAll(".coupon-button");
        buttons.forEach((btn) => {
          btn.disabled = false;
          btn.textContent = "Apply";
        });

        Swal.fire({
          icon: "success",
          title: "Coupon Removed!",
          text: data.message,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "An error occurred!",
        text: "Error while removing the coupon. Please try again.",
      });
    }
  } else {
    // Apply coupon (preview only)
    const grandTotal = originalGrandTotal;

    try {
      const response = await fetch("/applyCoupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponCode: couponCode,
          totalAmount: grandTotal,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update display with discounted amount
        grandTotalElement.textContent = data.finalAmount;
        appliedCouponCode = couponCode;
        currentDiscount = parseFloat(data.discountAmount);

        // Disable other coupon buttons
        const buttons = document.querySelectorAll(".coupon-button");
        buttons.forEach((btn) => {
          if (btn !== button) {
            btn.disabled = true;
          } else {
            btn.textContent = "Remove";
          }
        });

        Swal.fire({
          icon: "success",
          title: "Coupon Applied!",
          text: `Discount Amount: ₹${data.discountAmount}`,
          showConfirmButton: false,
          timer: 3000,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: data.message,
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "An error occurred!",
        text: "Error while applying the coupon. Please try again.",
      });
    }
  }
}

function placeOrder() {
  const selectPaymentMethod = document.querySelector(
    'input[name="payment_method"]:checked'
  );
  const selectedAddress = document.querySelector(
    'input[name="address"]:checked'
  );
  const totalAmountOfProducts = parseFloat(
    document.getElementById("grandTotal").textContent.replace(/[^\d.-]/g, "")
  );

  if (!selectPaymentMethod) {
    Swal.fire({
      icon: "warning",
      title: "Payment Method Missing",
      text: "Please select a payment method.",
    });
    return;
  }

  if (!selectedAddress) {
    Swal.fire({
      icon: "warning",
      title: "Address Missing",
      text: "Please select a shipping address.",
    });
    return;
  }

  const addressId = selectedAddress.value;
  const paymentMethod = selectPaymentMethod.value;

  // Check COD limit
  if (paymentMethod === "COD" && totalAmountOfProducts > 1000) {
    Swal.fire({
      icon: "warning",
      title: "Payment Restriction",
      text: "Cash on Delivery is only available for orders under ₹1000. Please select Online Payment or Wallet.",
      confirmButtonText: "OK",
    });
    return;
  }

  const orderData = {
    addressId: addressId,
    paymentMethod: paymentMethod,
    totalAmount: totalAmountOfProducts,
    appliedCouponCode: appliedCouponCode,
  };

  if (paymentMethod === "COD") {
    // COD orders can be created immediately
    fetch("/codOrder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...orderData,
        paymentStatus: "Pending", // COD is always pending initially
      }),
    })
      .then((response) => {
        if (response.ok) {
          Swal.fire({
            icon: "success",
            title: "Order Placed!",
            text: "Your COD order has been placed successfully.",
            confirmButtonText: "OK",
          }).then(() => {
            window.location.href = "/orderSuccess";
          });
        } else {
          return response.json().then((data) => {
            Swal.fire({
              icon: "error",
              title: "Order Failed",
              text: data.message || "Failed to place the order. Please try again.",
            });
          });
        }
      })
      .catch((error) => {
        console.error("COD order error:", error);
        Swal.fire({
          icon: "error",
          title: "An Error Occurred",
          text: "An error occurred while placing the order. Please try again.",
        });
      });
      
  } else if (paymentMethod === "Online") {
    // Show loading while preparing payment
    Swal.fire({
      title: 'Preparing Payment...',
      text: 'Please wait while we set up your payment',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // First, create Razorpay order (no database order yet)
    fetch("/onlinePay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...orderData,
        amount: totalAmountOfProducts,
        initial: true, // This tells backend to only create Razorpay order
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Razorpay order created:", data);
        
        // Close loading dialog
        Swal.close();

        if (!data.success) {
          throw new Error(data.message || "Failed to create payment order");
        }

        // Initialize Razorpay with correct amount
        const options = {
          key: "rzp_test_72sGbnDINNYlKN",
          amount: data.amount, // Discounted amount from backend
          currency: "INR",
          name: "SOLEWAY",
          description: "Purchase Details",
          order_id: data.orderId,
          handler: function (response) {
            console.log("Payment successful:", response);
            
            // Show success loading
            Swal.fire({
              title: 'Payment Successful!',
              text: 'Creating your order...',
              allowOutsideClick: false,
              didOpen: () => {
                Swal.showLoading();
              }
            });

            // NOW create the order in database after successful payment
            fetch("/onlinePay", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                addressId: selectedAddress.value,
                paymentStatus: "Received",
                paymentId: response.razorpay_payment_id,
                paymentMethod: paymentMethod,
                totalAmount: totalAmountOfProducts,
                appliedCouponCode: appliedCouponCode,
                initial: false, // This creates actual order
              }),
            })
              .then((orderResponse) => orderResponse.json())
              .then((orderData) => {
                console.log("Order created after payment:", orderData);
                
                if (orderData.success) {
                  Swal.fire({
                    icon: "success",
                    title: "Payment Successful!",
                    text: "Your payment was successful and your order has been placed.",
                    confirmButtonText: "OK",
                  }).then(() => {
                    window.location.href = "/orderSuccess";
                  });
                } else {
                  throw new Error(orderData.message || "Failed to create order");
                }
              })
              .catch((error) => {
                console.error("Order creation error after payment:", error);
                Swal.fire({
                  icon: "error",
                  title: "Order Creation Failed",
                  text: "Payment was successful but failed to create order. Please contact support with payment ID: " + response.razorpay_payment_id,
                  confirmButtonText: "OK"
                });
              });
          },
          prefill: {
            name: "SOLEWAY Customer",
            email: "customer@example.com",
            contact: "9999999999",
          },
          theme: {
            color: "#000000",
          },
          modal: {
            ondismiss: function () {
              console.log("Payment modal dismissed by user");
              
              // Payment was dismissed/cancelled - NO ORDER CREATED
              Swal.fire({
                icon: "info",
                title: "Payment Cancelled",
                text: "You cancelled the payment. No order has been created. You can try again anytime.",
                confirmButtonText: "OK",
              }).then(() => {
                // Just stay on the same page - no order created
                console.log("Payment cancelled, staying on checkout page");
              });
            },
            escape: false, // Prevent accidental ESC key dismissal
            backdropclose: false, // Prevent accidental backdrop click dismissal
          },
        };

        // Open Razorpay modal
        const razorpayInstance = new Razorpay(options);
        razorpayInstance.open();
      })
      .catch((error) => {
        console.error("Payment preparation error:", error);
        Swal.close(); // Close any loading dialogs
        Swal.fire({
          icon: "error",
          title: "Payment Setup Failed",
          text: error.message || "There was an error setting up the payment. Please try again.",
          confirmButtonText: "OK",
        });
      });
      
  } else if (paymentMethod === "Wallet") {
    // Show loading
    Swal.fire({
      title: 'Processing Payment...',
      text: 'Please wait while we process your wallet payment',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    fetch("/walletOrder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...orderData,
        paymentStatus: "Received", // Wallet payment is immediate
      }),
    })
      .then((response) => {
        Swal.close(); // Close loading
        
        if (response.ok) {
          return response.json().then((data) => {
            Swal.fire({
              icon: "success",
              title: "Order Placed!",
              text: "Your order has been placed successfully using wallet payment.",
              confirmButtonText: "OK",
            }).then(() => {
              window.location.href = "/orderSuccess";
            });
          });
        } else if (response.status === 400) {
          return response.json().then((data) => {
            Swal.fire({
              icon: "error",
              title: "Payment Failed",
              text: data.message || "Insufficient wallet balance. Please add funds to your wallet or choose a different payment method.",
              confirmButtonText: "OK"
            });
          });
        } else {
          throw new Error("Wallet payment failed");
        }
      })
      .catch((error) => {
        console.error("Wallet payment error:", error);
        Swal.close(); // Close any loading dialogs
        Swal.fire({
          icon: "error",
          title: "Payment Failed",
          text: "There was an error processing your wallet payment. Please try again.",
          confirmButtonText: "OK",
        });
      });
  }
}

// Address management functions
function toggleAddAddressForm() {
  var form = document.getElementById("add-address-form");
  form.style.display = form.style.display === "none" ? "block" : "none";
}

async function addAddress(event) {
  event.preventDefault();

  const name = document.getElementById("name").value;
  const mobile = document.getElementById("mobile").value;
  const homeAddress = document.getElementById("homeAddress").value;
  const city = document.getElementById("city").value;
  const district = document.getElementById("district").value;
  const state = document.getElementById("state").value;
  const pincode = document.getElementById("pincode").value;

  try {
    const response = await fetch("/Addaddress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        mobile,
        homeAddress,
        city,
        district,
        state,
        pincode,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      Toastify({
        text: "Address added successfully!",
        duration: 3000,
        gravity: "top",
        position: "center",
        backgroundColor: "green",
        stopOnFocus: true,
      }).showToast();

      setTimeout(() => {
        window.location.reload();
      }, 3000);
      document.getElementById("addressForm").reset();
    } else {
      Toastify({
        text: data.message || "Failed to add address",
        duration: 3000,
        gravity: "top",
        position: "center",
        backgroundColor: "red",
        stopOnFocus: true,
      }).showToast();
    }
  } catch (error) {
    Toastify({
      text: "Server error. Please try again.",
      duration: 3000,
      gravity: "top",
      position: "center",
      backgroundColor: "red",
      stopOnFocus: true,
    }).showToast();
  }
}

// Wallet balance visibility functions
function showWalletBalance() {
  var walletContainer = document.getElementById("wallet-balance-container");
  walletContainer.style.display = "block";
}

function hideWalletBalance() {
  var walletContainer = document.getElementById("wallet-balance-container");
  walletContainer.style.display = "none";
}

// Page initialization
document.addEventListener("DOMContentLoaded", function () {
  // Handle cart adjustments
  const adjustmentsData = document.getElementById("adjustmentsData")?.value;
  const adjustments = adjustmentsData ? JSON.parse(adjustmentsData) : [];

  if (adjustments && adjustments.length > 0) {
    adjustments.forEach((adjustment) => {
      Swal.fire({
        title: "Cart Adjustment",
        text: adjustment.message,
        icon: "info",
        confirmButtonText: "Okay",
      });
    });
  }

  // Prevent accidental page refresh during payment
  let paymentInProgress = false;
  
  // Set flag when payment starts
  document.addEventListener('razorpay_payment_start', () => {
    paymentInProgress = true;
  });
  
  // Clear flag when payment completes or fails
  document.addEventListener('razorpay_payment_end', () => {
    paymentInProgress = false;
  });
  
  // Warn user about page refresh during payment
  window.addEventListener('beforeunload', function (e) {
    if (paymentInProgress) {
      e.preventDefault();
      e.returnValue = 'Payment is in progress. Are you sure you want to leave?';
      return e.returnValue;
    }
  });
});