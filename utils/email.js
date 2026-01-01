const nodemailer = require("nodemailer");

const HOST = process.env.SMTP_HOST;
const PORT = process.env.SMTP_PORT;
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  host: HOST,
  port: PORT,
  secure: true,
  auth: {
    user: USER,
    pass: PASS,
  },
});

const sendEmail = async (recipient, code, validityPeriod) => {
  try {
    const expiry = new Date(Date.now() + validityPeriod);

    const formattedExpiry =
      expiry.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }) + " IST";

    const info = await transporter.sendMail({
      from: USER,
      to: recipient,
      subject: "EduCodeTrack - OTP Login",
      html: `
        <div style="font-family: sans; text-align: center; border: 2px solid #BBBBBB; border-radius: 2%; background-color: #b0e6e4ff; width: 100%; margin: 0">
          <h2>EduCodeTrack - OTP Details</h2>
          <h4>Your generated OTP for EduCodeTrack is</h4>
          <h1 style="letter-spacing: 1rem; font-size: 3.5rem; background-color: white; width: fit-content; margin: 0 auto; padding: 0 1% 0 2%; border-radius: 3%; border: 1px solid #BBBBBB">
            ${code}
          </h1>
          <p>Valid until <strong>${formattedExpiry}</strong></p>
          <h4>Do not share with anyone.</h4>
          <p style="font-size: 0.9rem; color: gray">
            This is an auto generated mail. Do not reply
          </p>
        </div>
      `,
    });

    return info;
  } catch (err) {
    throw err;
  }
};

module.exports = { sendEmail };
