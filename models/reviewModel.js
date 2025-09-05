import {Schema, model} from "mongoose";
import Tour from "./tourModel.js";

const reviewSchema = new Schema(
  {
    // İnceleme yazısı
    review: {
      type: String,
      required: [true, "Yorum içeriği boş olamaz."],
    },

    // Kullanıcı tarafından verilen puan
    rating: {
      type: Number,
      max: 5,
      min: 1,
      required: [true, "Puan değeri tanımlanmalı."],
    },

    //                                          POPULATE REFERENCES
    // ---------------------------------------------------------------------------------

    // İncelemeyi atan kullanıcı
    user: {
      // veri tipi objectıd olarak tutuldu. Çünkü mongo dökümanlarının ID'si string değildir
      type: Schema.ObjectId,
      // User objesi user koleksiyonundan bir döküman olduğu için hangi koleksiyondan veri araması gerektiğini ref kullanarak veriyoruz.
      ref: "User",
      required: [true, "İncelemeyi atan bir kullanıcı ID'si zorunludur."],
    },

    // İnceleme hangi tur ile alakalı ise ona bir gönderme yapıyoruz
    tour: {
      type: Schema.ObjectId,
      ref: "Tour",
      required: [true, "İncelemenin hangi tur için yapıldığını belirtin."],
    },

    // ---------------------------------------------------------------------------------

    anonymous: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

//                                          POPULATE MIDDLEWARE
// ---------------------------------------------------------------------------------

reviewSchema.pre(/^find/, function (next) {
  // ID olarak tutulan user'ı gerçek user'ın isim ve foto verisiyle değiştir AMA anonimse değiştirme
  if (!this.anonymous) {
    this.populate({
      path: "user",
      select: "name photo",
    });
  } else this.user = undefined;

  // ID olarak tutulan tur stringini gerçek tur verisiyle değiştirmek için populate işlemi
  this.populate({
    path: "tour",
    select: "name price",
  });

  next();
});

// ---------------------------------------------------------------------------------

//                                          COMPOUND INDEX (BİLEŞİK İNDEX)
// ---------------------------------------------------------------------------------

// 1 Kullanıcı istediği kadar inceleme oluşturabilir. Fakat aynı turla alakalı 1'den fazla inceleme yapmasını istemeyiz.
reviewSchema.index({tour: 1, user: 1}, {unique: true});

// ---------------------------------------------------------------------------------

// Herbir tur ile alakalı inceleme atıldığından turun rating ve ortalama puanını hesaplayıp güncelleyen fonksiyon
reviewSchema.statics.calculateAverage = async function (tourId) {
  // aggregate kullanarak istatistik hesaplama
  const stats = await this.aggregate([
    // 1) Parametre olan tourId ile eşleşen bütün incelemeleri alalım.
    {
      $match: {tour: tourId},
    },

    // 2) Toplam inceleme sayısını ve sayıların ortalama değerini hesapla
    {
      $group: {
        // Tur bazında gruplama yap
        _id: "$tour",
        nRating: {$sum: 1},
        avgRating: {$avg: "$rating"},
      },
    },
  ]);

  // Tura atılan yorum varsa hesaplanan istatistikleri tur belgesine kaydet yoksa varsayılan bir değer kaydet
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 3,
      ratingsQuantity: 0,
    });
  }
};

// Yukarıda sadece fonksiyonu belirledik. Şimdi ise ne zaman çalışacağını söylememiz lazım.

// 1) Her bir yeni inceleme kaydedildiğinde çalıştır
reviewSchema.post("save", function () {
  Review.calculateAverage(this.tour);
});

// 2) Silme veya güncelleme işlemlerinde de çalıştır
reviewSchema.post(/^findOneAnd/, function (document) {
  Review.calculateAverage(document.tour._id);
});

// reviewSchema taslağını kullanarak yeni bir model oluşturuyoruz
const Review = model("Review", reviewSchema);

export default Review;
