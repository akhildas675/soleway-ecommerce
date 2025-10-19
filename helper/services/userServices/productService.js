const Products = require("../../../Model/productModel");
const Category = require("../../../Model/categoryModel");

const getActiveProducts = async (limit = null) => {
  let query = Products.find({ is_active: true }).populate('categoryId');
  if (limit) query = query.limit(limit);
  
  const products = await query;
  return products.filter(product => product.categoryId && product.categoryId.is_active);
};

const getNewArrivals = async (limit = 3) => {
  const products = await Products.find({ is_active: true })
    .populate('categoryId')
    .sort({ createdAt: -1 })
    .limit(limit);
  
  return products.filter(product => product.categoryId && product.categoryId.is_active);
};

const getProductWithDetails = async (productId) => {
  return await Products.findOne({ _id: productId })
    .populate("categoryId")
    .populate("offerId")
    .populate({
      path: "review.userId",
      select: "name",
    });
};

const getRelatedProducts = async (categoryId, excludeId, limit = 4) => {
  return await Products.find({
    categoryId: categoryId,
    _id: { $ne: excludeId },
  }).limit(limit);
};

const searchAndFilterProducts = async (filters, sortOptions, page = 1, perPage = 8) => {
  const skip = (page - 1) * perPage;
  
  const [totalProducts, products] = await Promise.all([
    Products.countDocuments(filters),
    Products.find(filters)
      .populate("categoryId")
      .sort(sortOptions)
      .skip(skip)
      .limit(perPage)
  ]);

  const activeProducts = products.filter(product => 
    product.categoryId && product.categoryId.is_active
  );

  return { products: activeProducts, totalProducts, totalPages: Math.ceil(totalProducts / perPage) };
};

module.exports = { 
  getActiveProducts, 
  getNewArrivals, 
  getProductWithDetails, 
  getRelatedProducts,
  searchAndFilterProducts
};
