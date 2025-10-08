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
    subject: `Your Soleway Verification OTP`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
            margin: 0;
            padding: 0;
            color: #000000;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            padding: 20px;
          }
          .header {
            background-color: #000000;
            color: #ffffff;
            padding: 15px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            padding: 20px;
            text-align: center;
          }
          .otp {
            font-size: 24px;
            font-weight: bold;
            color: #000000;
            margin: 20px 0;
            letter-spacing: 2px;
            background-color: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #555555;
            padding: 10px;
            border-top: 1px solid #cccccc;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #000000;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Soleway, ${name}!</h1>
          </div>
          <div class="content">
            <p>Thank you for signing up with Soleway! Please use the following One-Time Password (OTP) to verify your account:</p>
            <div class="otp">${otp}</div>
            
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Soleway. All rights reserved.</p>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  console.log('otp for signup', `Verification OTP sent to ${email}`);

  return await transporter.sendMail(mailOptions);
};

const sendPasswordResetOTP = async (email, name, otp) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: `Soleway Password Reset OTP`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f0f0f0;
            margin: 0;
            padding: 0;
            color: #000000;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            padding: 20px;
          }
          .header {
            background-color: #000000;
            color: #ffffff;
            padding: 15px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            padding: 20px;
            text-align: center;
          }
          .otp {
            font-size: 24px;
            font-weight: bold;
            color: #000000;
            margin: 20px 0;
            letter-spacing: 2px;
            background-color: #f0f0f0;
            padding: 10px;
            border-radius: 5px;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #555555;
            padding: 10px;
            border-top: 1px solid #cccccc;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #000000;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Soleway Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>We received a request to reset your Soleway account password. Please use the following One-Time Password (OTP) to proceed:</p>
            <div class="otp">${otp}</div>
            
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Soleway. All rights reserved.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  console.log('otp for password reset', `Password reset OTP sent to ${email}`);

  return await transporter.sendMail(mailOptions);
};

module.exports = { generateOTP, sendOTPEmail, sendPasswordResetOTP };