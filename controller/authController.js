import User from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import sendMail from "../utils/sendMail.js";
import cryto from "crypto";

// Token oluşturma fonksiyonu (kullanıcı, bu tokeni geri göndererek giriş yapmş olduğunu kanıtlayacak)
const signToken = (userid) => {
  // JWT oluşturma komutu

  return jwt.sign(
    // payload (jwt nin içinde bulunacak veri)
    {id: userid},
    // secret şifreleme için kullanılacak anahtar yazı
    process.env.JWT_SECRET,
    // options (son kullanma tarihi)
    {
      expiresIn: process.env.JWT_EXP,
    }
  );
};

// Token oluştur ve client'a gönder ek fonksiyon
const createAndSendToken = (user, code, res) => {
  // token'i oluştur (parametre olarak moongoda tutulan user id ver)
  const token = signToken(user._id);

  // JWT göndermenin 2 yöntemi vardır(body, cookie)

  // 2. Yöntem Cookie olarak göndermek
  res.cookie("jwt", token, {
    // 10 dakikayı milisaniye cinsine çeviriyoruz
    expires: new Date(Date.now() + 10 * 60 * 1000),

    // saldırılara karşı güvenli olması için
    httpOnly: true,
    // sadece https protolünde seyahat eder
    // secure: true
  });

  // 1. yöntem => Body'den gönderme
  const newUser = user;
  newUser.passwordConfirm = undefined;
  newUser.__v = undefined;

  res.status(code).json({message: "Oturum açıldı", token, newUser});
};

// ------------------------------------------------- AUTHORIZATION MIDDLEWARE -------------------------------------------------

// Authorization Middleware'ı
// Client'a bir token gönderdik ve client'ten beklentimiz bize u JWT'yi giriş yaptığını ve yetkisi olduğunu kanıtlamak amacıyla her istekte geri göderilmesidir.

// Auth Middleware'ı bu gönderilen tokenin doğru ve geçerli olduğunu kontrol edip bir sonraki istek adımına geçilmesine izin verir
// Yanlış ya da geçersiz ise isteği sonlandırır. Bu sayede yetkisiz kişiler sisteme erişim sağlayamaz

export const protect = async (req, res, next) => {
  // Cliant'den gelen tokeni al
  // tarayıcılar cookie kullanabilir fakat mobil ve pc uygulamaları cookie erişimi yoktur. Bu nedenle 2 yöntemide kullanmamız gerekir
  let token = req?.cookies?.jwt || req?.headers?.authorization;

  // Token var mı kontrol et
  if (!token) {
    return res.status(401).send({
      success: false,
      message: "JWT gönderilmedi. Lütfen tekrar giriş yapın. ",
    });
  }

  // Token var ise bearer etiketini çıkart
  if (token.startsWith("Bearer")) {
    // Boşluğa göre böl ve ikinci kısmı al
    token = token.split(" ")[1];
  }

  // Tokenin geçerliliğini doğrula
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.message === "jwt expired") {
      return res.status(403).send({
        success: false,
        message: "Oturumunuzun süresi doldu lütfen giriş yağınız",
      });
    } else {
      return res.status(400).send({
        success: false,
        message: " Gönderilen token geçerli değil, tekrar giriş yapın",
      });
    }
  }

  // Tokeni ile ID'si gelen kullanıcını hesabı duruyor mu
  const activeUser = await User.findById(decoded.id);

  // Durmuyorsa hata döndür
  if (!activeUser)
    return res.status(404).send({
      success: false,
      message: "Böyle bir kullanıcı veritabanında bulunmamaktadır",
    });

  // Duruyor fakat kullanıcı yasaklı ise
  if (activeUser.active == false)
    return res.status(400).send({
      success: false,
      message: "Bu hesap askıya alınmıştır.Lüften destek ile iletişime geçin",
    });

  // Token verildikten sonra kullanıcı hiç şifre değiştirmiş mi?
  if (activeUser.passChangeAt) {
    // Şifrenin değiştirilme tarihini öğren
    const passChangedSeconds = parseInt(
      activeUser.passChangeAt.getTime() / 1000
    );

    // Şifrenin değiştirme tarihi ile JWT'nin oluşturulma tarihini sayı cinsinden kıyasla
    // Şifre değiştirlme tarihi JWT oluşturulma tarihinden daha büyük hata döndür
    if (passChangedSeconds > decoded.iat) {
      return res.status(401).send({
        success: false,
        message: "Yakın zamanda şifreniz değiştirildi, tekrar giriş yapınız.",
      });
    }
  }

  // req.user değerini bulduğumuz kullanıcı olarak belirleyelim ki bir sonraki her istekle find yapmak zorunda kalmayalım
  req.user = activeUser;

  // Eğer bütün doğrulamalarda geçerse middleware i kabul et ve bir sonraki aşamaya geçmeye izin ver
  next();
};

// Rol bazlı yetki middleware'ı
// örn bazı rotalara sadece adminler/moderatörler erişsin düz kullanıcıların erişme yetkisi olmasın
export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    //
    //
    // 1) İzin verilen rollerin arasında mevcut kullanıcının yoksa hata gönder
    // req.suer diyereke kullanıcıya ulaşabiliriz. Çünkü protect middleware'ın da zaten kullanıcıyı almıştık
    if (!roles.includes(req.user.role)) {
      return res.status(403).send({
        success: false,
        message: "Bu işlem için yetkiniz yok. Rol yetersiz.",
      });
    }

    // 2) Yetkisi var ise middleware'dan geçilmesine izin ver
    next();
  };

// -------------------------------------------------

// AUTH FONKSİYONLARI

export const register = async (req, res) => {
  try {
    //
    // mongodaki User koleksiyonuna bağlan, yeni bir kullanıcı oluştur ve oluşan kullanıcıyı bana newUser olarak gönder
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    // cevap olarak gönderilecek passwordconfirm değerini cevaptan kaldır
    newUser.passwordConfirm = undefined;
    newUser.__v = undefined;

    createAndSendToken(newUser, 201, res);
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      success: false,
      message: "Bir hata oluştu",
      error: err.message,
    });
  }
};

export const login = async (req, res) => {
  const {email, password} = req.body;

  // email ve şifre geldi  mi ?

  if (!email || !password) {
    return res.status(400).json({
      message: "Email veya şifre eksik",
      success: false,
    });
  }

  // Gelen email ile kayıtlı kullanıcı var mı ?
  const user = await User.findOne({email: email});

  // Eğer bu email ile kayıtlı kullanıcı yoksa hata döndür
  if (!user) {
    return res.status(400).json({
      message:
        "Giriş yapmaya çalıştığınız e-posta ile kayıtlı kullanıcı bulunamadı",
      success: false,
    });
  }

  // Active değeri false ise yani kullanıcı yasaklı ise hesabı askıya alınmışsa hata döndür
  if (!user.active) {
    return res.status(401).json({
      message:
        "Bu hesap askıya alınmıştır. Lütfern destekm ile iletişime geçin",
      success: false,
    });
  }

  // Hash şifre kontrolü
  // Kullanıcının gönderdiği hash salt olmayan şifreyi veri tabanındaki hash ve salt ile uyumlu mu incelememiz gerekir
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: "Girilen şifre geçersiz",
    });
  }

  // Eğer üsteki bütün kontrollerden geçildi ise o zaman yeni bir jwt oluştur ve kullanıcıya gönder
  createAndSendToken(user, 200, res);
};

export const logout = async (req, res) => {
  try {
    res
      .clearCookie("jwt")
      .status(200)
      .json({success: true, message: "Oturumunuz kapatıldı."});
  } catch (err) {
    res.status(500).send({
      success: false,
      message: "Çıkış işlemi yapılırken hata oluştu.",
      data: err,
    });
  }
};

// -------------------------------------------------
// ŞİFRE UNUTMA FONKSİYONLARI

export const forgotPassword = async (req, res) => {
  try {
    // E-postaya göre kullanıcı hesabına eriş

    // 1) Veritabanında kullanıcı emailine sahip birisi var mı kontrol et
    const user = await User.findOne({email: req.body.email});

    // 2) Böyle bir kullanıcı yoksa hata döndür
    if (!user)
      return res.status(404).send({
        success: false,
        message: "Bu mail adresine kayıtlı kullanıcı bulunamadı",
      });

    // 3) Şifre sıfırlama tokeni oluştur
    const resetToken = user.createResetToken();
    //
    // 4) Günvellemeleri veri tabanına veri doğrulaması olmadan kaydet
    await user.save({validateBeforeSave: false});

    // 5) Tokeni kullanarak kullanıcının şifre sıfırlayabileceği endpoint'e istek atılacak bir link oluştur
    const şifreSıfırlamaLinki = `${req.protocol}://${req.headers.host}/api/users/reset-password/${resetToken}`;

    // 6) Oluşturulan linki kullanıcıya mail olarak gönder
    await sendMail({
      email: user.email,
      subject: "Şifre sıfırlama bağlantınız (15dk) ",
      text: resetToken,
      html: `
      <h2> Merhaba ${user.name}</h2>
      <p>
        <b> ${user.email}</b> e-posta adresine bağlı mongotours hesabı için şifre sıfırlama bağlantısı oluşturuldu.
      </p>
      
        <a href="${şifreSıfırlamaLinki}"> ${şifreSıfırlamaLinki}</a>

        <p>Yeni şifrenizin içinde bulunduğu bir body ile yukarıdaki bağlantıya <b>PATCH</b> isteği attınız</p>

        <p><b>Saygılarımızla, MongoTours</b></p> 
      
      `,
    });

    // 7) Client'a cevap gönder
    res
      .status(200)
      .send({success: true, message: "Şifre yenileme e-postanız gönderildi"});
    //
    //
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    // 1) Gelen Token'den yola çıkarak kullanıcıyı bul

    const token = req.params.token;

    // 2) Elimizdeki token şifrelenmemiş veritabanında şifrelenmiş olduğu için
    // tokenin doğru olup olmadığını görebilmek adına elimizdeki tokeni hash'leyip kıyaslayacağız

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 3) Hash'lenmiş tokene sahip kullanıcı var mı kontrol et (Token geçerli mi?)

    const user = await User.findOne({
      // Tokeni uyuşan kullanıcı var mı

      passResetToken: hashedToken,

      // 4) Tokenin bitme tarihi şimdiki tarihten daha büyükse değilse etme (Geçmiş zaman ise reddet)

      passResetExpires: {$gt: Date.now()},
    });

    if (!user) {
      return res.status(403).send({
        success: false,
        message: "Şifre sıfırlama tokenin süresi dolmuş veya geçersiz",
      });
    }

    // 5) Eğer buraya kadar hiçbir sorun yoksa kullanıcı bilgilerini güncelle
    user.password = req.body.newPass;
    user.passwordConfirm = req.body.newPass;
    user.passResetToken = undefined;
    user.passResetExpires = undefined;

    // 6) Kullanıcıyı kaydet
    await user.save();

    return res
      .status(200)
      .json({success: true, message: "Şifreniz başarıyla güncellendi"});
  } catch (error) {
    return res.status(500).send({success: false, error: error.message});
  }
};

// -------------------------------------------------
// ŞİFRE DEĞİŞTİRME FONKSİYONLARI

export const updatePassword = async (req, res) => {
  //
  // Kullanıcı bilgilerini al
  const user = req.user;

  // 1) Kullanıcı yoksa veya banlanmış ise

  if (!user || !user.active) {
    return res.status(404).send({
      success: false,
      message:
        "Şifresini değiştirmek istediğiniz hesap yok veya askıya alınmış",
    });
  }

  // 2) Gelen mevcut şifreyi teyit et
  const passMatch = await user.correctPass(req.body.currentPass, user.password);

  // a) kullanıcının girdiği şifre ile vt şifre eşleşmiyorsa hata döndür
  if (!passMatch) {
    return res.status(403).send({
      success: false,
      message: "Girdiğiniz mevcut şifre hatalı",
    });
  }

  // 3) Doğruysa yeni şifreyi vt kaydet
  user.password = req.body.newPass;
  user.passwordConfirm = req.body.newPass;

  // şifresini güncellediğimiz kullanıcıyı kaydet
  await user.save();

  // 4) ISTEĞE BAĞLI kullanıcının şifre değişimini bilgilendirme mail atarız

  await sendMail({
    email: user.email,
    subject: "MongoTours hesap şifreniz güncellendi.",
    text: "Bilgilendirme e-postası",
    html: `
    <h1>Hesap bilgileriniz güncellendi</h1>
    <p>Merhaba, ${user.name}</p>
    <p>Hesap şifreniz başarıyla güncellendiğini bildiririz. Bu değişiklik size ait değilse lütfen destekle iletişime geçiniz.</p>

    <p>Saygılarımızla</p>
    <p><b>MongoTours Ekibi</b></p>

    `,
  });

  res.status(201).json({
    success: true,
    message: "Şifreniz başarıyla değiştirildi. Tekrar giriş yapabilirsiniz.",
  });
};
