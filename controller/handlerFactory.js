import {model} from "mongoose";
import APIFeatures from "../utils/apiFeatures.js";

// HANDLE FACTORY, pek çok isteği standardize ederek bütün modellerde ortak olan fonksiyonları tek bir yerde toplar

// Belirli bir koleksiyon içindeki bütün dökümanları al

export const getAll = async (Model, req, res) => {
  try {
    // Yukarıda model parametresini almamızın amacı bu fonksiyonu her veri türü için kullanmak

    let filters = {};

    const features = new APIFeatures(
      Model.find(filters),
      req.query,
      req.formattedParams
    )
      .filter()
      .limit()
      .sort()
      .pagination();

    const documents = await features.query;

    return res.status(200).send({
      success: true,
      message: `${Model.modelName} koleksiyonundaki  bütün veriler getirildi`,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      error: error.message,
    });
  }
};

// Belirli bir koleksiyonun içindeki sadece bir tane dökümanı al
export const getSingle = async (Model, req, res) => {
  try {
    const documentId = req.params.id;

    // documentId parametresine sahip dökümanı bul
    const document = await Model.findById(documentId);

    // Döküman  bulunamazsa hata döndür
    if (!document) {
      return res.status(404).send({
        success: false,
        message: `Aradığınız ${Model.modelName} bulunamadı`,
      });
    }

    return res.status(200).send({
      success: true,
      message: `${Model.modelName} başarıyla getirildi`,
      data: document,
    });
  } catch (err) {
    return res.status(500).send({
      success: false,
      message: "Bir hata oluştu",
      data: err,
    });
  }
};

// Belirli bir koleksiyona yeni bir döküman ekle
export const createOne = async (Model, req, res) => {
  try {
    // Eğer atılan istek review route atılıyorsa isteğimin gövdesinde olmayan user verisini önceki middleware gelen user olarak belirleyerek body oluştur diyoruz. Bu sayede isteğimin gövdesinde user göndermek zorunda kalmıyorum.
    if (Model.modelName === "Review") req.body.user = req.user;

    const newDocument = await Model.create(req.body);

    res.status(201).json({
      success: true,
      message: `${Model.modelName} başarıyla oluşturuldu`,
      data: newDocument,
    });
  } catch (err) {
    console.log(err);

    if (err.code == 11000)
      return res.status(400).send({
        success: false,
        error: "Bu turla alakalı incelemeniz zaten var.",
      });

    res.status(500).send({success: false, error: err});
  }
};

// Belirli bir koleksiyondan spesifik bir elemanı silme
export const deleteOne = async (Model, req, res) => {
  // Öncelikle parametreden gelen ID'ye göre dökümanı buluyoruz
  const document = await Model.findById(req.params.id);

  if (!document)
    return res.status(404).send({
      success: false,
      message: `Aradığınız ${Model.modelName} bulunamadı.`,
    });

  // eğer model tipi review ise silmeye çalışan kullanıcı oluşturan kullanıcı ile aynı mı kontrol ediyoruz
  if (Model.modelName == "Review") {
    //
    const docId = document.user._id.toString();
    const usrId = req.user._id.toString();

    if (docId !== usrId)
      return res
        .status(403)
        .send({success: false, error: "Bu inceleme size ait değil"});
  }

  // Eğer aynı ise yukarıda aldığımız döküman örneğini siliyoruz
  await document.deleteOne();

  res.status(200).send({
    success: true,
    message: `${Model.modelName} başarıyla silindi.`,
  });
};

// Belirli bir koleksiyondaki spesifik bir elemanı güncelleme
export const updateOne = async (Model, req, res) => {
  //
  // {new: true} ekleyerek güncelendikten sonraki halini dokümana gönderir
  const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!doc)
    return res.status(404).send({
      success: false,
      message: `Güncellemek istediğiniz ${Model.modelName} bulunamadı.`,
    });

  res
    .status(200)
    .send({
      success: true,
      message: `${Model.modelName} başarıyla güncellendi.`,
      data: doc,
    });
};
