let timerDuration = 20;
let timer;

function startTimer() {
    let seconds = timerDuration;
    timer = setInterval(function () {
        document.getElementById("timerDisplay").innerHTML = `Resend OTP in ${seconds} seconds`;
        if (--seconds < 0) {
            clearInterval(timer);
            document.getElementById("timerDisplay").innerHTML = "";
            document.getElementById("resendButton").disabled = false;
        }
    }, 1000);
}

function resendOTP() {
    document.getElementById("resendButton").disabled = true;
    startTimer();

    fetch('/otpGet', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        Toastify({
            text: "OTP resent successfully!",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#28a745",
            stopOnFocus: true
        }).showToast();
    })
    .catch(error => {
        console.error('Fetch error:', error);
        Toastify({
            text: "Failed to resend OTP. Please try again.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#dc3545",
            stopOnFocus: true
        }).showToast();
    });
}

function validateOtp(e) {
    if (e) e.preventDefault();
    
    let otp1 = document.getElementById('otp1').value;
    let otp2 = document.getElementById('otp2').value;
    let otp3 = document.getElementById('otp3').value;
    let otp4 = document.getElementById('otp4').value;
    let otpCode = otp1 + otp2 + otp3 + otp4;

    if (otpCode.length !== 4 || otp1 === "" || otp2 === "" || otp3 === "" || otp4 === "") {
        Toastify({
            text: "Please enter a valid 4-digit OTP code.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#dc3545",
            stopOnFocus: true
        }).showToast();
        return false;
    }

    // Submit OTP via fetch
    fetch('/verifyOtp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otp: otpCode })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            Toastify({
                text: data.message,
                duration: 2000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "#28a745",
                stopOnFocus: true
            }).showToast();
            
            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = data.redirect;
            }, 2000);
        } else {
            Toastify({
                text: data.message,
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                backgroundColor: "#dc3545",
                stopOnFocus: true
            }).showToast();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        Toastify({
            text: "An error occurred. Please try again.",
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: "#dc3545",
            stopOnFocus: true
        }).showToast();
    });

    return false;
}

const inputs = document.querySelectorAll('.otp-field input');
inputs[0].focus();

for (let index = 0; index < inputs.length; index++) {
    const input = inputs[index];

    input.addEventListener('input', () => {
        input.value = input.value.replace(/[^0-9]/g, '');
        if (input.value.length === 1) {
            if (index !== inputs.length - 1) {
                inputs[index + 1].removeAttribute('disabled');
                inputs[index + 1].focus();
            }
        } else {
            if (index !== 0) {
                inputs[index].value = '';
                inputs[index - 1].focus();
            }
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
            if (input.value.length === 0 && index !== 0) {
                inputs[index - 1].focus();
            }
        }
    });
}

window.onload = startTimer;