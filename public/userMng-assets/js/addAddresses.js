async function submitAddressForm() {
  const formData = {
    name: document.getElementById("name").value.trim(),
    mobile: document.getElementById("mobile").value.trim(),
    homeAddress: document.getElementById("homeAddress").value.trim(),
    city: document.getElementById("city").value.trim(),
    district: document.getElementById("district").value.trim(),
    state: document.getElementById("state").value.trim(),
    pincode: document.getElementById("pincode").value.trim(),
  };

  // Basic client-side validation
  for (const key in formData) {
    if (!formData[key]) {
      Toastify({
        text: `Please fill in the ${key} field`,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#ef4444",
        stopOnFocus: true,
      }).showToast();
      return;
    }
  }

  // Mobile validation
  if (!/^[0-9]{10}$/.test(formData.mobile)) {
    Toastify({
      text: "Please enter a valid 10-digit mobile number",
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "#ef4444",
      stopOnFocus: true,
    }).showToast();
    return;
  }

  // Pincode validation
  if (!/^[0-9]{6}$/.test(formData.pincode)) {
    Toastify({
      text: "Please enter a valid 6-digit pincode",
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: "#ef4444",
      stopOnFocus: true,
    }).showToast();
    return;
  }

  try {
    const response = await fetch("/Addaddress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.ok) {
      Toastify({
        text: "Address added successfully!",
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: "#10b981",
        stopOnFocus: true,
      }).showToast();

      setTimeout(() => {
        window.location.href = "/addresses";
      }, 1500);
    } else {
      Toastify({
        text: data.message.join ? data.message.join(", ") : data.message,
        duration: 5000,
        gravity: "top",
        position: "right",
        backgroundColor: "#ef4444",
        stopOnFocus: true,
      }).showToast();
    }
  } catch (error) {
    console.error("Error:", error);
    Toastify({
      text: "An error occurred. Please try again.",
      duration: 5000,
      gravity: "top",
      position: "right",
      backgroundColor: "#ef4444",
      stopOnFocus: true,
    }).showToast();
  }
}

// Allow only numbers in mobile and pincode fields
document.getElementById("mobile")?.addEventListener("input", function (e) {
  this.value = this.value.replace(/[^0-9]/g, "");
});

document.getElementById("pincode")?.addEventListener("input", function (e) {
  this.value = this.value.replace(/[^0-9]/g, "");
});
