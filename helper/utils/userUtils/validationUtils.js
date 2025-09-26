const validateUserRegistration = (data) => {
  const { name, email, password, cPassword, mobile } = data;
  let errors = [];

  if (!name) errors.push("Name is required.");
  
  if (!email) {
    errors.push("Email is required.");
  } else {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push("Please enter a valid email address.");
    }
  }

  if (!mobile) {
    errors.push("Mobile number is required.");
  } else {
    const mobilePattern = /^[0-9]{10}$/;
    if (!mobilePattern.test(mobile)) {
      errors.push("Please enter a valid mobile number.");
    }
  }

  if (!password) {
    errors.push("Password is required.");
  } else if (password.length < 8 || password.length > 12) {
    errors.push("Password must be between 8 and 12 characters long.");
  } else if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  } else if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number.");
  } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character.");
  }
  
  if (!cPassword) {
    errors.push("Confirm password is required.");
  } else if (password && password !== cPassword) {
    errors.push("Passwords do not match.");
  }

  return errors;
};

const validateAddress = (data) => {
  const { name, mobile, homeAddress, city, district, state, pincode } = data;
  let errors = [];

  if (!name) errors.push("Name is required");

  const mobilePattern = /^[0-9]{10}$/;
  if (!mobile) {
    errors.push("Mobile number is required");
  } else if (!mobilePattern.test(mobile)) {
    errors.push("Please enter a valid 10-digit mobile number");
  }

  if (!homeAddress) errors.push("Home address is required");
  if (!city) errors.push("City is required");
  if (!district) errors.push("District is required");
  if (!state) errors.push("State is required");

  const pincodePattern = /^[0-9]{6}$/;
  if (!pincode) {
    errors.push("Pincode is required");
  } else if (!pincodePattern.test(pincode)) {
    errors.push("Pincode must be a 6-digit number");
  }

  return errors;
};

const validateFeedback = (data) => {
  const { name, email, subject, comment } = data;
  let errors = [];

  if (!name?.trim()) errors.push("Name is required.");
  if (!subject?.trim()) errors.push("Subject is required.");
  if (!comment?.trim()) errors.push("Message is required.");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email?.trim()) {
    errors.push("Email is required.");
  } else if (!emailRegex.test(email)) {
    errors.push("Please enter a valid email address.");
  }

  return errors;
};

module.exports = { validateUserRegistration, validateAddress, validateFeedback };