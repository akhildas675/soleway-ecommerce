const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSKEY,
    },
  });
};

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const sendOTPEmail = async (email, name, otp) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: `Hello ${name}`,
    text: `Your verification OTP is ${otp}`,
  };

  console.log('otp for signup',mailOptions.text)

  return await transporter.sendMail(mailOptions);
};

const sendPasswordResetOTP = async (email, name, otp) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: `Hello ${name}`,
    text: `Your forgot password verifying OTP is ${otp}`,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { generateOTP, sendOTPEmail, sendPasswordResetOTP };
