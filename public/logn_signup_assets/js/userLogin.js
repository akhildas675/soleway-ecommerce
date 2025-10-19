  async function loginUser(event) {
            event.preventDefault();
            const userEmail = document.getElementById('user_email').value;
            const userPassword = document.getElementById('user_password').value;
            let data = {
                email: userEmail,
                password: userPassword,
            };
            try {
                const response = await fetch('/verifylog', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    Toastify({
                        text: result.message || "Login successful",
                        duration: 1000,
                        gravity: "top",
                        position: "right",
                        backgroundColor: "green",
                    }).showToast();
                    setTimeout(() => window.location.href = '/', 1000);
                } else {
                    Toastify({
                        text: result.message || "Login error",
                        duration: 1000,
                        gravity: "top",
                        position: "right",
                        backgroundColor: "red",
                    }).showToast();
                }
            } catch (error) {
                console.log(error);
                Toastify({
                    text: "An error occurred. Please try again.",
                    duration: 1000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "red",
                }).showToast();
            }
        }
        document.getElementById("userLogin").addEventListener('submit', loginUser);
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