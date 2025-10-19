 async function addUser(event) {
            event.preventDefault();
            const userName = document.getElementById("user_name").value;
            const userEmail = document.getElementById("user_email").value;
            const userMobile = document.getElementById("user_mobile").value;
            const userPassword = document.getElementById("user_password").value;
            const userCpassword = document.getElementById("user_cpassword").value;
            const data = {
                name: userName,
                email: userEmail,
                mobile: userMobile,
                password: userPassword,
                cPassword: userCpassword
            };
            try {
                const response = await fetch('/verifyRegister', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    Toastify({
                        text: result.message || "Registration successful!",
                        duration: 3000,
                        gravity: "top",
                        position: "center",
                        backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
                    }).showToast();
                    setTimeout(() => { window.location.href = result.redirect; }, 2000);
                } else {
                    if (result.errors && Array.isArray(result.errors)) {
                        result.errors.forEach(error => {
                            Toastify({
                                text: error,
                                duration: 3000,
                                gravity: "top",
                                position: "right",
                                backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
                            }).showToast();
                        });
                    } else {
                        Toastify({
                            text: result.message || "Error during registration",
                            duration: 3000,
                            gravity: "top",
                            position: "right",
                            backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
                        }).showToast();
                    }
                }
            } catch (error) {
                console.error("Error:", error);
                Toastify({
                    text: "Failed to register. Please try again.",
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "linear-gradient(to right, #ff5f6d, #ffc371)",
                }).showToast();
            }
        }
        document.getElementById("userRegister").addEventListener('submit', addUser);
        const togglePasswordIcons = document.querySelectorAll('.togglePassword');
        togglePasswordIcons.forEach(toggleIcon => {
            toggleIcon.addEventListener('click', function () {
                const passwordField = this.previousElementSibling;
                const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordField.setAttribute('type', type);
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            });
        });