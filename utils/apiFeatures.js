// Filtreleme sayfalama sıralama ve alan limiti gibi özellikleri projede ihtiyacımız olan her yerde kodu tekrar etmeden yazabilmek için ortam bir class oluşturalım

class APIFeatures {
  constructor(query, params, formattedParams) {
    this.query = query;
    this.params = params;
    this.formattedParams = formattedParams;
  }

  filter() {
    // 1) Turlar için sorgu oluştur
    this.query = this.query.find(this.formattedParams);

    return this;
  }

  sort() {
    // 2) Eğer sort ifadesi varsa ona göre sıralam yoksa en yeni elemanı en başa koy
    if (this.params.sort) {
      // Mongo sortlanacak elemanların arasında "," değil " "(boşluk) istiyor o yüzden değiştirecez
      this.query.sort(this.params.sort.replaceAll(",", " "));
    } else {
      this.query.sort("-createdAt");
    }

    return this;
  }

  limit() {
    // 3) Eğer fields parametresi varsa alan limitle
    if (this.params.fields) {
      // Fields değerine girilen değerler neyse sadece onlar getirilecek
      const fields = this.params.fields.replaceAll(",", " ");
      this.query.select(fields);
    }

    return this;
  }

  pagination() {
    // 4) Pagination - Sayfalama
    const page = Number(this.params.page) || 1;
    const limit =
      this.params.limit <= 30
        ? Number(this.params.limit)
        : this.params.limit
        ? 30
        : 20;
    const skip = (page - 1) * limit; // Limit çalışmadan önce atlayacağımız eleman sayısı

    this.query.skip(skip).limit(limit);

    return this;
  }
}

export default APIFeatures;
