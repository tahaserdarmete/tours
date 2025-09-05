import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const sendMail = async ({email, subject, text, html}) => {
  // Mail servis sağlayıcını ayarla

  const transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  // Mail içeriğiini belirle
  const mailOptions = {
    // Gönderen kullanıcı adresi
    from: "'Taha Serdar' <info@mongotours.com>",

    // Gönderilecek kullanıcının adresi
    to: email,

    // Konu
    subject,

    // Düz Yazı
    text,

    // Html
    html,
  };

  // Oluşturduğum ayarlara sahip maili gönder
  await transporter.sendMail(mailOptions);
};

export default sendMail;
