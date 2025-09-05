import Tour from "../models/tourModel.js";
import {createOne, getAll, getSingle} from "./handlerFactory.js";

//
// Günün fırsatları için filtrelemeri ayarlayan yalancı kontrolcü
// getAllTours'a atılan istek eğer boş ise kullanıcının en çok isteyebileceği fırsatları getiren bir sorgulama oluştur
export const aliasTopTours = async (req, res, next) => {
  req.query.sort = "-ratingsAverage,-ratingsQuantity";
  req.query.fileds = "name,price,ratingsAverage,summary,difficulty";
  req.query["price[lte]"] = 1200;
  req.query.limit = 5;

  next();
};

export const getAllTours = async (req, res) => getAll(Tour, req, res);

export const getSingleTour = async (req, res) => getSingle(Tour, req, res);

export const createTour = async (req, res) => createOne(Tour, req, res);
//
//
//
//                              AGGREGATION CONTROLLERS
// -----------------------------------------------------------------------------
// getTourStats: Zorluk seviyesine göre tur istatistiklerini hesapla
export const getTourStats = async (req, res) => {
  //
  // MongoDB' nin aggregation PipeLine ile istatistik hesabı yapalım

  const stats = await Tour.aggregate([
    //
    //
    // 1. Adım: Ortalama rating'i ortalamanın üstü olanlar dursun, geri kalan dizide dursun
    {
      $match: {ratingsAverage: {$gte: 4.5}},
    },

    //
    // 2. Adım: Turları zorluk seviyesine göre grupla ve istatistikleri hesapla
    {
      $group: {
        _id: "$difficulty", // Zorluk seviyesine göre grupla ÖNEMLİ, grupların neye göre ayrılacağını ve kaç grup olacağını bu alan belirler

        count: {$sum: 1}, // Her grupta kaç tur var say
        avgRating: {$avg: "$ratingsAverage"}, // Ortalama puan hesabı
        avgPrice: {$avg: "$price"}, // Ortalama fiyat hesabı
        minPrice: {$min: "$price"}, // Bu gruba dahil nesnelerdeki en düşük fiyatı al
        maxPrice: {$max: "$price"}, // Bu gruba dahil nesnelerdeki en yüksek fiyatı al
      },
    },

    // 3. Adım: Ortalama fiyatı artan şekilde sırala
    {$sort: {avgPrice: 1}},
    {$match: {avgPrice: {$gte: 500}}},
  ]);

  // JSON cevabı gönder
  res.status(200).json({
    success: true,
    message: "Rapor oluşturuldu",
    data: stats,
  });
};

// getMonthlyPlan: Yıla göre bir ay için tur istatistiği hesapla
export const getMonthlyPlan = async (req, res) => {
  // Parametrelerden yıl değerini al ve Number formatına çevir
  const year = Number(req.params.year);

  const stats = await Tour.aggregate([
    // 1. Adım : Unwind

    // startDates dizisini açarak her ayrı tarihi ayrı bir belge haline getir. Bu sayede bir tur birkaç farklı ayda yapılıyorsa her bir ayın istatistiğini ektileyebilsin
    {
      $unwind: {
        path: "$startDates",
      },
    },

    // 2. Adım : Yalnızca belirtilen yıl içerisinde gerçekleşen turları seç
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`), // parametrede belirtilen yılın başından
          $lte: new Date(`${year}-12-31`), // parametrede belirtilen yılın sonuna kadar olan verileri al
        },
      },
    },

    // 3. Adım : Turları aylara göre gruplandır ve istatistileri hesapla
    {
      $group: {
        // Date formatındaki veriden sadece ay verisini alır
        _id: {$month: "$startDates"}, // Ay bazında grupla
        count: {$sum: 1}, // Her bir tur için toplam tur sayısına 1 ekle
        tours: {$push: "$name"},
        avgRatings: {$avg: "$ratingsAverage"},
        avgPrice: {$avg: "$price"},
      },
    },

    // 4. Adım : Gruplandırma yaparken ID olarak gruplara ayırmamız gerekir. Fakat kullanıcıya bu şekilde göndermek güzel gözükmeyeceğinden bu alanı "month" alanı ile değiştireceğiz
    {
      $addFields: {
        month: "$_id",
      },
    },

    // 5. Adım : Artık month değerimiz ay verisini tuttuğundan ID verisine ihtiyaç kalmadığından gereksiz veriyi temizliyoruz
    {
      $project: {
        _id: 0,
      },
    },

    // 6. Adım : Aylara göre artan sıralama yap
    {
      $sort: {month: 1},
    },
  ]);

  // JSON cevabı gönder
  res.status(200).json({
    success: true,
    message: "Ay bazından yıllık rapor oluşturuldu",
    data: stats,
  });
};
