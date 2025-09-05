import mongoose, {model, Schema} from "mongoose";
import validator from "validator";

// Veritabanına kaydedilecek bir tur objesinin gerekliliklerini ve şeklini tanımlamak
const tourSchema = new Schema(
  {
    name: {
      type: String,
      unique: [true, "İsim değeri benzersiz olmalı"],
      required: [true, "Turun bir ismi olmak zorundadır"],
      minLength: [5, "Tur ismi en az 5 karakter olmalıdır"],
      maxLength: [40, "Tur ismi en fazla 40 karakter olmalıdır"],
      // validate: [
      //   validator.isAlpha, // sadece alfabetik karakterler olduğuna emin olur
      //   "İsimde sadece alfabetik karakterlere yer vardır",
      // ],
    },

    duration: {
      type: Number,
      required: [true, "Tur süresi boş bırakılamaz"],
    },

    maxGroupSize: {
      type: Number,
      ruquired: [true, "Tur maksimum üye sayısına sahip olmalıdır."],
    },
    difficulty: {
      type: String,
      required: [true, "Tur zorluk değerine sahip olmalıdır"],
      enum: ["easy", "medium", "hard", "difficult"],
    },

    ratingsAverage: {
      type: Number,
      min: [1, "Rating 1'den küçük olamaz"],
      max: [5, "Rating 5'ten büyük olamaz"],
      default: 3.0,
    },

    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    premium: {
      type: Boolean,
      default: false,
    },

    price: {
      type: Number,
      required: [true, "Tur ücret değerine sahip olmalıdır"],
    },

    priceDiscount: {
      type: Number,
      // Custom validator => Kendi yazdığımız doğrulayıcı
      validate: {
        validator: function (value) {
          // İndirimli fiyat(value) normal fiyattan (this.price) küçükse true değişse false döndür
          return value < this.price;
        },
        message: "İndirimli fiyat asıl fiyattan büyük olmamalıdır",
      },
    },

    summary: {
      type: String,
      maxLength: [200, "Özet alanı 200 karakteri geçemez"],
      minLength: [20, "En az 20 karakter uzunluğunda bir özet yazınız"],
      trim: true,
      required: [true, "Tur özet değerine sahip olmak zorundadır"],
    },

    imageCover: {
      type: String,
      required: [true, "Tur kapak resmine sahip olmalıdır"],
    },

    images: {
      type: [String],
      default: [],
    },

    startDates: {
      type: [Date],
      default: [],
    },

    createdAt: {
      type: Date,
      default: new Date(),
    },

    hour: {
      type: Number,
      default: 1,
    },

    // REFERANSLAMA
    // Herbir guide(rehberimiz) user koleksiyonundaki bir veriyi (kullanıcıyı) işaret eder.
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
  },

  // Yukarıda şemanın tutacağı değerleri belirttik. Burada ise ek ayarları belirteceğiz
  {
    // JSON'a çevrildiğinde dahil olsun
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
);

// ------------------------------------------------------------------------------------------------------------
// Virtual Property (Sanal Değer)
// VEeri tabanında tutmaya değmeyecek fakat yine de kullanıcı istek atarken lazım olacak verileri Virtual Property yani Sanal Değer olarak tutarız, bu sayede veritabanında yer kaplamaz ama veri kullanıcıya gönderilmeden hemen önce veriyi oluşturmuş oluruz ve kullanıcıya göndeririz.

// Örnek: Çok Uzun Bir Gezi İsmi  =>  cok-uzun-bir-gezi-ismi (slug yapısı)

tourSchema.virtual("slug").get(function () {
  return this.name.toLowerCase().replaceAll(" ", "-");
});

// Örnek 2: Client sayfasında kullanmak için turun dolar değil TL fiyatını istedi. Dolar fiyatı bilindiği için diğer para türlerine çevirmek ve kullanıcıya gönderilmeden önce hesaplayıp gönderecez
tourSchema.virtual("priceTL").get(function () {
  // İstenilirse sabit değer verilebilir. İstenilirse belirli bir yere istek atarak kur'u güncel tutarakda gönderebiliriz.
  const USD = 40;

  return this.price * USD;
});

// ------------------------------------------------------------------------------------------------------------

// Document Middleware
// Middleware iki olay arasında çalışan fonksiyon

// Bir belge kaydedilmesinden, güncellenmesinden, silinmesinden ya da okunmasından önce veya sonra bir işlem gerçekleştirmek için kullanırız.

// Client'tan gelen tur verisinin veritabanına kaydedilmeden önce kaç saat sürdüğünü hesapla ve veritabanına öyle kaydet

// ? Virtual sadece kullanıcıya gönderilmeden önce veri oluşturup gönderebilirken, Middleware'ler kalıcı veriler de belirleyebilir.

// pre önce anlamında veri tabanına kaydedilmeden önce saat hesabı yapacak fonksiyon
tourSchema.pre("save", function (next) {
  // VT'ye kaydedilmeden önce duration değerini kullanarak hour hesapla ve VY'ye o şekilde kaydet
  // duration gün cinsinden, hour ise saat cinsinden
  this.hour = this.duration * 24;

  next();
});

// ------------------------------------------------------------------------------------------------------------
// Aggregate Middleware (Raporlama analiz için kullanılan genel bir isim yer tutucu)

// .pre(işlem) İşlem gerçekleşmeden önce çalışan middleware
tourSchema.pre("aggregate", function (next) {
  // Premium olan turların rapora dahil edilmemesi için aggregation pipeline'a başlangıç adımı olarak premium'ları çıkartan bir adım eklemeliyiz.
  this.pipeline().push({$match: {premium: {$ne: true}}});

  next();
});

// .post(işlem) İşlem gerçekleştıkten sonra çalışan middlaware
tourSchema.post("aggregate", function (_, next) {
  next();
});

// POPULATE MIDDLEWARE'ı
tourSchema.pre(/^find/, function (next) {
  // Sorgumuzdaki guides dizisi sadece ID tutuyor. Kullanıcıya gönderilmeden önce bu ID'ler gerçek veriye çevirmek gerek
  this.populate({
    // ID'yi objeye çevirmek istediğimiz alan
    path: "guides",
    // Populate işlemi yaparken getirmek istemediğimiz alanları burada belirleyebiliriz
    select: "-password -__v -active ", // Bu değerlerin başına konulan "-" bu değerler haricindeki değerleri getir diyoruz
  });

  next();
});

const Tour = model("Tour", tourSchema);

export default Tour;
