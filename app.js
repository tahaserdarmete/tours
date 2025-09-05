import express from "express";
import userRoutes from "./routes/userRoutes.js";
import tourRoutes from "./routes/tourRoutes.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import reviewRoutes from "./routes/reviewRoutes.js";

// dotenv kütüphanesini çevre değişkenlerine eklemek için
dotenv.config();

// Express sunucu örneği al
const app = express();

// Mongo veri tabanına bağlan
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("BAŞARILI !! MongoDB ile bağlantı kuruldu"))
  .catch((err) =>
    console.log("BAŞARISIZ !! MongoDB'ye bağlanırken hata oluştu")
  );

// MIDDLEWARE
// --------------------------------------------------
// Body parse middleware
app.use(express.json());

// Cookie parse middleware
app.use(cookieParser());

// --------------------------------------------------

// Rotaları Uygulamaya Tanıt
app.use("/api/users", userRoutes);
app.use("/api/tours", tourRoutes);
app.use("/api/reviews", reviewRoutes);

// Sunucunun çalışacağı port
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is runnig on port ${PORT}`);
});
