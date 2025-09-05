import multer from "multer";
import User from "../models/userModel.js";
import {getAll} from "./handlerFactory.js";
import sharp from "sharp";

// ? Multer Kurulumu
// ? Multer kurulum için bizden dosyaların nereye depolanacağını belirtmemizi ister. Verilen bu dizin neticesinde bize dosya yükleyebilmemiz için gerekli metodu döndürür.

// Diskstorage Kurulumu
// const multerStorage = multer.diskStorage({
//   // Dosyanın yükleneceği dizini belirt
//   destination: function (req, file, cb) {
//     cb(null, "public/images/users");
//   },

//   // Kayıt edilecek dosyanın adı
//   filename: function (req, file, cb) {
//     // Dosya uzantısı dinamik olarak eriş

//     // Yüklenecek dosya için uniq bir isim oluştur
//     const ext = file.mimetype.split("/")[1];

//     cb(null, `user-${Date.now()}.${ext}`);
//   },
// });

// MemoryStorage Kurulumu
const multerStorage = multer.memoryStorage();

const upload = multer({
  storage: multerStorage,
});

// SHARP kütüphanesi ile yüklenecek resimleri düzenleyecek biir fonksiyon
export const resize = (req, res, next) => {
  // Eğer dosya yoksa fonksiyonu durdur
  if (!req.file) return next();

  // İşlem yapılacak dosyanın adını belirle
  const fileName = `${req.user.id}-${Date.now()}.wepb`;

  // Gelen dosyayı dönüştür
  sharp(req.file.buffer)
    .resize(100, 100) // Dosya boyutubu belirle
    .toFormat("webp") // dosya formatını ayarla
    .webp({quality: 70}) // Kalite ayarı
    .toFile(`public/images/users/${fileName}`); // Kayıt edilecek dizini belirle

  // Sonraki adımda revize edilen resime eriş
  req.file.path = fileName;

  next();
};

// Multer ile dosya yükleyecek fonksiyon
export const uploadUserImage = upload.single("photo");

// Kullanıcının dosya yükleme endpointine istek attığında karşılık verecek fonksiyon
export const updateMe = async (req, res) => {
  // Kullanıcıya ait değerleri yöneteceğimiz obje
  const filtredBody = {
    name: req.user.name,
  };

  //  Eğer kullanıcı resim eklemediyse fonksiyonu durdur
  if (!req.file) return;

  // Eğer kullanıcı resim eklediyse
  filtredBody.photo = req.file.path;

  // Resim yükleyen kullanıcıyı bul ve onun bilgilerini güncelle
  const updatedUsers = await User.findByIdAndUpdate(req.user.id, filtredBody, {
    news: true,
  }).select("-password -__v");

  return res.json({
    message: "Kullanıcı profili başarıyla güncellendi.",
    updatedUsers,
  });
};

export const getAllUsers = async (req, res) => getAll(User, req, res);
