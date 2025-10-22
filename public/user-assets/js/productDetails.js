// Initialize Magic Zoom with enhanced settings
document.addEventListener("DOMContentLoaded", function () {
  if (typeof MagicZoom !== "undefined") {
    MagicZoom.refresh();
  }
});

// Reinitialize Magic Zoom when slider changes
$(".slick3").on("afterChange", function (event, slick, currentSlide) {
  setTimeout(function () {
    if (typeof MagicZoom !== "undefined") {
      MagicZoom.refresh();
    }
  }, 100);
});

// Initialize Select2
$(".js-select2").each(function () {
  $(this).select2({
    minimumResultsForSearch: 20,
    dropdownParent: $(this).next(".dropDownSelect2"),
  });
});

// Initialize Parallax
$(".parallax100").parallax100();

// Initialize Gallery Lightbox
$(".gallery-lb").each(function () {
  $(this).magnificPopup({
    delegate: 'a[data-lightbox="product-gallery"]',
    type: "image",
    gallery: {
      enabled: true,
    },
    mainClass: "mfp-fade",
  });
});

// Perfect Scrollbar
$(".js-pscroll").each(function () {
  $(this).css("position", "relative");
  $(this).css("overflow", "hidden");
  var ps = new PerfectScrollbar(this, {
    wheelSpeed: 1,
    scrollingThreshold: 1000,
    wheelPropagation: false,
  });
  $(window).on("resize", function () {
    ps.update();
  });
});

// Function to update cart count in header
function updateCartCount(newCount) {
  const cartIcons = document.querySelectorAll('.icon-header-noti[href="/Cart"]');
  cartIcons.forEach((icon) => {
    icon.setAttribute("data-notify", newCount);
  });
}

// Wishlist Toggle Function
function toggleWishList(productId) {
  fetch("/toggleWishlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId: productId }),
  })
    .then((response) => response.json())
    .then((data) => {
      const button = document.querySelector(
        `.js-addwish-b2[data-product-id="${productId}"]`
      );
      const icon = button ? button.querySelector("i") : null;

      if (data.success) {
        if (data.action === "added") {
          if (button && icon) {
            button.classList.add("active");
            icon.classList.remove("bi-heart");
            icon.classList.add("bi-heart-fill");
          }
        } else {
          if (button && icon) {
            button.classList.remove("active");
            icon.classList.remove("bi-heart-fill");
            icon.classList.add("bi-heart");
          }
        }
        // Update wishlist count in header
        const wishlistIcons = document.querySelectorAll(
          ".icon-header-noti[data-notify]"
        );
        wishlistIcons.forEach((icon) => {
          if (icon.getAttribute("href") === "/Wishlist") {
            const newCount = data.wishlistCount || 0;
            icon.setAttribute("data-notify", newCount);
          }
        });
      } else {
        console.error("Failed to update wishlist:", data.message);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

// Star Rating Logic
const allStars = document.querySelectorAll(".star");
const ratingInput = document.getElementById("rating");

allStars.forEach((star, index) => {
  star.onclick = function () {
    ratingInput.value = index + 1;
    allStars.forEach((s, i) => {
      if (i <= index) {
        s.innerHTML = "&#9733;";
        s.classList.add("selected");
      } else {
        s.innerHTML = "&#9734;";
        s.classList.remove("selected");
      }
    });
  };
});

// Review Submission with Toast Notifications
document.getElementById("reviewForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rating = document.getElementById("rating").value;
  const comment = document.getElementById("review").value;
  const productId = document.getElementById("productId").innerText.trim();

  // Client-side validation
  if (!rating || rating === "0") {
    Toastify({
      text: "Please select a rating by clicking on the stars!",
      duration: 3000,
      close: true,
      gravity: "top",
      position: "center",
      backgroundColor: "#dc3545",
    }).showToast();
    return;
  }

  if (!comment || comment.trim() === "") {
    Toastify({
      text: "Please write a review comment!",
      duration: 3000,
      close: true,
      gravity: "top",
      position: "center",
      backgroundColor: "#dc3545",
    }).showToast();
    return;
  }

  try {
    const response = await fetch("/submitReview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId,
        rating,
        comment,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Success toast
      Toastify({
        text: result.message || "Review submitted successfully!",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "center",
        backgroundColor: "#28a745",
      }).showToast();

      // Reset form
      document.getElementById("reviewForm").reset();
      document.getElementById("rating").value = "0";

      // Reset stars
      allStars.forEach((star) => {
        star.innerHTML = "&#9734;";
        star.classList.remove("selected");
      });

      // Reload page after delay to show new review
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      // Error toast
      Toastify({
        text: result.message || "Failed to submit review!",
        duration: 4000,
        close: true,
        gravity: "top",
        position: "center",
        backgroundColor: "#dc3545",
      }).showToast();
    }
  } catch (error) {
    console.error("Error submitting review:", error);
    Toastify({
      text: "Network error. Please try again!",
      duration: 3000,
      close: true,
      gravity: "top",
      position: "center",
      backgroundColor: "#dc3545",
    }).showToast();
  }
});

// Add to Cart Logic
let selectedSizeId;
let productId;

document
  .getElementById("selectedSize")
  .addEventListener("click", function (event) {
    document.getElementById("selectErr").style.display = "none";
    document.querySelectorAll(".size").forEach((element) => {
      element.classList.remove("sizeErr");
    });

    const target = event.target.closest(".size-option");
    productId = document.getElementById("productId").innerText;

    if (target) {
      if (target.classList.contains("disabled")) {
        Swal.fire({
          title: "Out of Stock",
          text: "The selected size is out of stock.",
          icon: "warning",
          showConfirmButton: true,
        });
      } else {
        selectedSizeId = target.getAttribute("data-id");
        let options = document.querySelectorAll(".size-option");
        options.forEach((option) => option.classList.remove("selected"));
        target.classList.add("selected");

        const quantityDisplay = document.getElementById("quantity-display");
        const quantityValue = document.getElementById("quantity-value");
        const quantity = target.getAttribute("data-quantity");

        quantityValue.textContent = quantity;
        quantityDisplay.style.display = "block";

        document.getElementById("addToCartBtn").disabled = false;
      }
    }
  });

document.getElementById("addToCartBtn").addEventListener("click", function () {
  if (!selectedSizeId) {
    document.querySelectorAll(".size").forEach((element) => {
      element.classList.add("sizeErr");
    });
    document.getElementById("selectErr").style.display = "block";
    return;
  } else {
    const payload = {
      productId: productId.toString().trim(),
      sizeId: selectedSizeId,
    };

    fetch("/addToCart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        let nameProduct = document.getElementById("productName").innerText;
        if (data.success) {
          // Update cart count immediately after successful addition
          updateCartCount();
          
          Swal.fire({
            title: nameProduct,
            text: "is added to cart!",
            icon: "success",
            showCancelButton: true,
            confirmButtonText: "Go to Cart",
            cancelButtonText: "Stay Here",
            reverseButtons: true,
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = "/Cart";
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              Swal.fire({
                title: "Great!",
                text: "You can continue shopping.",
                icon: "info",
                showConfirmButton: false,
                timer: 1500,
              });
            }
          });
        } else {
          Swal.fire({
            title: nameProduct,
            text: data.message || "Something went wrong",
            icon: "error",
            showConfirmButton: false,
            timer: 2000,
          });
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        Swal.fire({
          title: "Error",
          text: "An error occurred while adding the product to the cart.",
          icon: "error",
          showConfirmButton: false,
          timer: 2000,
        });
      });
  }
});