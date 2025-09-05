import express from "express";
import Tour from "../models/tourModel.js";
import {getAll} from "../controller/handlerFactory.js";
import {
  aliasTopTours,
  createTour,
  getAllTours,
  getMonthlyPlan,
  getSingleTour,
  getTourStats,
} from "../controller/tourController.js";
import formatQuery from "../utils/formatQuery.js";
import {protect, restrictTo} from "../controller/authController.js";

const router = express.Router();

//                          ÖZEL METODLAR (İSTATİSTİK, ADMİN VS.)
// -------------------------------------------------------------------------------

// Tur istatistiklerini gönderen route
router.route("/tour-stats").get(protect, restrictTo("admin"), getTourStats);

router
  .route("/monthly-plan/:year")
  .get(protect, restrictTo("admin"), getMonthlyPlan);

//                          STANDART METODLAR
// -------------------------------------------------------------------------------

// En yüksek ortalamaya ratinge ve inceleme sayısına sahip 5 turu gönderen endpoint

// NOT: Kullanıcı doğru parametreleri oluşturup istek atarsa zaten aynı cevabı alabilir. Fakat parametre sayısı çok olduğundan frontend e kolaylık olması açısından bazı sorgulamaları kendimiz endpoint haline getiririz.
router.route("/top-tours").get(aliasTopTours, getAllTours);

// Bütün turları getir
router.get("/", formatQuery, getAllTours);

// Yeni tur oluştur

// Sadece admin'ler yeni bir tur oluşturabilir
router.post("/", protect, restrictTo("admin"), createTour);

// Spesikif bir turu al
router.get("/:id", protect, getSingleTour);

export default router;
