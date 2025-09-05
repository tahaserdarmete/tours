import {model, Schema} from "mongoose";
import validator from "validator";
import bcrypto from "bcrypt";
import crypto from "crypto";

const userSchema = new Schema({
  name: {
    type: String,
    required: [
      true,
      "Kullanıcı isim değerine sahip olmalıdır / User must have username",
    ],
  },

  email: {
    type: String,
    required: [
      true,
      "Kullanıcı email değerine sahip olmalıdır / User must have email value",
    ],
    unique: [
      true,
      "Bu eposta adresine ait kayıtlı bir hesap bulunmaktadır / There is already an account usign this email ",
    ],
    validate: [
      validator.isEmail,
      "Lütfen geçerli bir email giriniz / Please enter a valid email",
    ],
  },

  photo: {
    type: String,
    default: "defaultpic.webp",
  },

  password: {
    type: String,
    reqired: [
      true,
      "Kullanıcı şifre değerine sahip olmalıdır. / User must have a password",
    ],
    minLength: [
      8,
      "Şifre en az 8 karakter olmalıdır / Password must include at least 8 characters",
    ],
    validate: [
      validator.isStrongPassword,
      "Şifreniz yeterince güçlü değil / Your password is not strong enough.",
    ],
  },

  passwordConfirm: {
    type: String,
    reqiured: [
      true,
      "Lüften şifrenizi doğrulayın / Please confirm your password",
    ],
    validate: {
      validator: function (value) {
        return value === this.password;
      },
      message: "Şifreleriniz eşleşmiyor / Your passwords don't match.",
    },
  },

  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },

  active: {
    type: Boolean,
    default: true,
  },

  // Şifre değiştirilme tarihini tutarak kıyaslayıp bütün sistemlerden çıkış yap
  passChangeAt: Date,

  // Şifre değiştirmeye yarayan token
  passResetToken: String,

  // Şifre değiştirme tokeninin geçerlilik tarihini de tutarız.(Genelde yaklaşık 10-15 dk geçerli olur.)
  passResetExpires: Date,
});

// ------------------ MIDDLEWARES -------------------

// Sadece kullanıcı kayıt olurken şifleri kıyaslamak için gerekli olan passpordConfirm değerini kullanıcıyı kaydetmeden önce silen middleware
userSchema.pre("save", async function (next) {
  this.passwordConfirm = undefined;

  // Şifreyi Hash ve Salt la
  this.password = await bcrypto.hash(this.password, 12);

  next();
});

// Şifre değiştirildiğinde değiştirme tarihini güncelle
userSchema.pre("save", async function (next) {
  //
  // Eğer şifre değiştirilmediyse veya kullanıcı ilk defa oluşturuluyorsa hiçbir şey yapma ve geç
  if (!this.isModified("password") || this.isNew) return next();
  //

  // Eğer şifre değiştiyse değişim tarihini güncelle
  // Şuanki tarihten 1 sn öncesi olarak ayarla
  this.passChangeAt = Date.now() - 1000;
});

// ------------------ METHODS -------------------

// METHOD => Mongo veri şemasındaki vri tiplerinin kendi içlerinde çalıştırabilen fonksiyonlara metod deriz.
// Ör: .createResetToken() methodu User modelinde çalıştırılıp sırf o kullanıcı için bir reset token oluşturabiliriz.
userSchema.methods.createResetToken = function () {
  // Şifre sıfırlama tokeni oluşturan ve döndüren fonksiyon

  // 1) 32 bt'lık rastgele bir string oluşturup bunu daha da karmaşık olması için  hex tarzında bir yazıya dönüştür
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2) Oluşturulan tokeni Hash'le
  this.passResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 3) resetTokeninin son geçerlilik  tarihini veritabanına kaydet
  this.passResetExpires = Date.now() + 15 * 60 * 1000;

  // Tokenin normal halini fonksiyonun çağırıldığı yere döndür
  return resetToken;
};

// Şifre doğrulama metodu (method sadece model üzerinde erişilebilir)

// Normal şifre ile hash'lenmiş şifreyi kıyas eden method
userSchema.methods.correctPass = async function (pass, hashedPass) {
  //

  // İki şifre birbiriyle eşleşiyorsa true, değilse false döndür
  return await bcrypto.compare(pass, hashedPass);
};

// Kullanıcı modeli (bu objeyi kullanarak eleman alma, yükleme, güncelleme, silme her şeyi yapabiliriz)
const User = model("User", userSchema);

export default User;
