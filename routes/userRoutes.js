import express from "express";
import {
  getAllUsers,
  resize,
  updateMe,
  uploadUserImage,
} from "../controller/userController.js";
import {
  forgotPassword,
  login,
  logout,
  protect,
  register,
  resetPassword,
  updatePassword,
} from "../controller/authController.js";
import sendMail from "../utils/sendMail.js";
import User from "../models/userModel.js";
import crypto from "crypto";

// Bir yönlendirici örneği al
const router = express.Router();

// GİRİŞ KAYDOLMA ROTALARI --------------------------------

router.get("/", protect, getAllUsers);

router.post("/login", login);

router.post("/logout", logout);

router.post("/register", register);

// ŞİFRE ROTALARI ---------------------------------------

// Kullanıcı şifresini unuttuğunda müracaat edeceği ilk yer bu rota
// Bu rota şifre değişştirmez. Sadece şifre değiştirme e-postası gönderir.
router.post("/forgot-password", forgotPassword);

// Üstteki rota mailinize bir e-posta gönderir. O e-postaya tıklayıp yönlendirildiğinizde
// Bu rotaya yönlendirilirsiniz
// Bu rota şifre değiştirme rotası

// Token parametresi ile e-mail erişimi olamayan kötü amaçlı kişilerin şifremizi sıfırlayamamasıdır.
router.patch("/reset-password/:token", resetPassword);

// ---------- ŞİFRE DEĞİŞTİRME (UNUTMA DEĞİL) ----------

// ? Şifresini hatırlayan bir kullanıcının şifre değiştirme isteği
router.patch("/update-password", protect, updatePassword);

// ! Kullanıcının dosya yüklemesini sağlayacak route
router.patch("/update-me", protect, uploadUserImage, resize, updateMe);

export default router;
