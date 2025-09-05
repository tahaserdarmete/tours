const formatQuery = (req, res, next) => {
  // Url'den gelen parametreler mongodb operatörlerse başlarına $ işareti ekle
  // 1) İstek ile gelen parametrelere eriş
  const queryObj = {...req.query};

  // 2) Filtrelemeye tabi tutulmayacak parametreleri çıkar

  // İLK YÖNTEM tek tek silme
  // delete queryObj.sort
  // delete queryObj.fields

  // İKİNCİ YÖNTEM daha basit ve modüler olan yöntem
  const deleteFields = ["sort", "fields", "page", "limit"];

  deleteFields.forEach((el) => delete queryObj[el]);

  // 3) Replace gibi string değiştirme metodları için stringe çevir
  let queryString = JSON.stringify(queryObj);

  // 4) Bütün mongo operatörlerinin başına $ ekle
  queryString = queryString.replace(
    /\b(gt|gte|lt|tle|ne)\b/g,
    (match) => `$${match}`
  );

  // 5) request nesnesine formatlanmış query ekliyoruz
  req.formattedParams = JSON.parse(queryString);

  req.formattedParams = parseQueryStrings(req.formattedParams);

  next();
};

export default formatQuery;

function parseQueryStrings(queryObj) {
  const result = {};

  for (const [key, value] of Object.entries(queryObj)) {
    if (typeof value === "string" && value.startsWith("{$")) {
      // "$gt:500" → '"$gt":500'
      const fixed = value.replace(/(\$\w+):/g, '"$1":');
      result[key] = JSON.parse(fixed);
    } else {
      result[key] = value;
    }
  }

  return result;
}
