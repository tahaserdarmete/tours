// Kod yazma aşamasında sıklıkla veri kaybı yaşayabiliriz veya deneme yanılma yaparken CRUD çok fazla veriye yada çok az veriye sahip olabiliriz. Bu durumda verileri manuel bir şekilde istediğimiz şekle getirmek yerine kod yazarak otomatik bir şekilde yapılmasını sağlayabiliriz.

import fs from "fs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Tour from "../models/tourModel.js";
import User from "../models/userModel.js";
import {dirname} from "path";
import {fileURLToPath} from "url";

// Modül yöntemi ile dirname gibi değişkenlere erişme
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// JSON dosyasından verileri al
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours-simple.json`));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`));

// dotenv kütüphanesine çevre değişkenlerine erişmek için kur
dotenv.config();

// Mongo veriTabanına bağlan
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Komut yürütmek için Mongo ile bağlantı kuruldu"))
  .catch((err) =>
    console.log(
      "Komut yürütmek için Mongo ile bağlantı kurulurken hata oluştu",
      err
    )
  );

//   Verilerimizi mongodaki koleksiyonlara aktaracak fonksiyon
const importData = async () => {
  try {
    // tours ve users verilerini Mongo koleksiyonlarına aktar
    await Tour.create(tours, {validateBeforeSave: false});
    await User.create(users, {validateBeforeSave: false});

    console.log("Json verileri koleksiyonlara aktarıldı");
  } catch (err) {
    console.log("Json aktarımı hata: ", err);
  }

  //   Bu fonksiyon tamamlandığında terminalin serbest kalması için işlemi sonlandır
  process.exit();
};

// Mongodaki verileri silen fonksiyon
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();

    console.log("Bütün veriler temizlendi");
  } catch (err) {
    console.log(err);
  }

  //   Bu fonksiyon tamamlandığında terminalin serbest kalması için işlemi sonlandır
  process.exit();
};

// Node ile dosyayı çalıştırırken en sona koyduğumuz bütün yazılar argüman sayılır. Bu özelliği kullanarak import mu delete mi kararını verebiliriz.

if (process.argv.includes("--import")) {
  importData();
} else if (process.argv.includes("--delete")) {
  deleteData();
} else {
  console.log("UYARI: Silme veya ekleme argümanı veriniz");
  process.exit();
}
