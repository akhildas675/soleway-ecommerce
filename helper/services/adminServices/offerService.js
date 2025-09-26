const Offer = require("../../../Model/OfferModel");

const getAllOffers = async () => {
  return await Offer.find();
};

const getOfferById = async (offerId) => {
  return await Offer.findById(offerId);
};

const createOffer = async (offerName, offerPercentage) => {
  // Check if offer percentage already exists
  const existingOffer = await Offer.findOne({ offerPercentage });
  if (existingOffer) {
    throw new Error(`An offer with ${offerPercentage}% discount already exists. Please enter a different percentage.`);
  }

  const newOffer = new Offer({
    offerName: offerName.trim(),
    offerPercentage,
    isActive: true,
  });

  return await newOffer.save();
};

const updateOfferById = async (offerId, offerName, offerPercentage) => {
  // Check if another offer with same percentage exists
  const existingOffer = await Offer.findOne({
    offerPercentage: offerPercentage,
    _id: { $ne: offerId },
  });

  if (existingOffer) {
    throw new Error(`An offer with ${offerPercentage}% discount already exists.`);
  }

  const updatedOffer = await Offer.findByIdAndUpdate(
    offerId,
    {
      offerName: offerName,
      offerPercentage: offerPercentage,
    },
    { new: true }
  );

  if (!updatedOffer) {
    throw new Error("Offer not found");
  }

  return updatedOffer;
};

const deleteOfferById = async (offerId) => {
  const deletedOffer = await Offer.findByIdAndDelete(offerId);
  if (!deletedOffer) {
    throw new Error("Offer not found");
  }
  return deletedOffer;
};

module.exports = {
  getAllOffers,
  getOfferById,
  createOffer,
  updateOfferById,
  deleteOfferById
};