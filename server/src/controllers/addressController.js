import Address from "../models/Address.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  isValidIndianPhone,
  isValidIndianPincode,
  isValidPersonName,
} from "../utils/inputValidation.js";

const addressFields = [
  "type",
  "fullName",
  "phone",
  "houseNo",
  "street",
  "landmark",
  "city",
  "state",
  "pincode",
];

const addressData = (body) => {
  const data = {};

  for (const field of addressFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  return data;
};

const validateAddress = (data, partial = false) => {
  const required = [
    "fullName",
    "phone",
    "houseNo",
    "street",
    "city",
    "state",
    "pincode",
  ];
  if (!partial) {
    for (const field of required) {
      if (typeof data[field] !== "string" || !data[field].trim()) {
        throw new AppError(`${field} is required.`, 400);
      }
    }
  }
  if (data.fullName !== undefined && !isValidPersonName(data.fullName, { max: 80 })) {
    throw new AppError("Enter a valid name using letters and basic punctuation.", 400);
  }
  if (data.phone !== undefined && !isValidIndianPhone(String(data.phone).trim()))
    throw new AppError("Enter a valid 10-digit Indian mobile number.", 400);
  if (
    data.pincode !== undefined &&
    !isValidIndianPincode(String(data.pincode).trim())
  )
    throw new AppError(
      "Enter a valid 6-digit PIN code starting with 1-9.",
      400,
    );
  if (data.type !== undefined && !["Home", "Work", "Other"].includes(data.type))
    throw new AppError("Address type must be Home, Work, or Other.", 400);
};

export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({
    isDefault: -1,
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    results: addresses.length,
    addresses,
  });
});

export const createAddress = asyncHandler(async (req, res) => {
  const data = addressData(req.body);
  validateAddress(data);

  const existingCount = await Address.countDocuments({
    user: req.user._id,
  });

  const makeDefault =
    req.body.isDefault === true ||
    req.body.isDefault === "true" ||
    existingCount === 0;

  if (makeDefault) {
    await Address.updateMany(
      { user: req.user._id, isDefault: true },
      { $set: { isDefault: false } },
    );
  }

  const address = await Address.create({
    ...data,
    user: req.user._id,
    isDefault: makeDefault,
  });

  res.status(201).json({
    success: true,
    message: "Address added successfully.",
    address,
  });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!address) {
    throw new AppError("Address not found.", 404);
  }

  const data = addressData(req.body);
  validateAddress(data, true);

  if (req.body.isDefault === true || req.body.isDefault === "true") {
    await Address.updateMany(
      { user: req.user._id, isDefault: true },
      { $set: { isDefault: false } },
    );

    address.isDefault = true;
  } else if (req.body.isDefault === false || req.body.isDefault === "false") {
    address.isDefault = false;
  }

  Object.assign(address, data);
  await address.save();

  const hasDefault = await Address.exists({
    user: req.user._id,
    isDefault: true,
  });

  if (!hasDefault) {
    const nextAddress = await Address.findOne({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  res.status(200).json({
    success: true,
    message: "Address updated successfully.",
    address,
  });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!address) {
    throw new AppError("Address not found.", 404);
  }

  const wasDefault = address.isDefault;

  await address.deleteOne();

  if (wasDefault) {
    const nextAddress = await Address.findOne({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  res.status(200).json({
    success: true,
    message: "Address deleted successfully.",
  });
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!address) {
    throw new AppError("Address not found.", 404);
  }

  await Address.updateMany(
    { user: req.user._id, isDefault: true },
    { $set: { isDefault: false } },
  );

  address.isDefault = true;
  await address.save();

  res.status(200).json({
    success: true,
    message: "Default address updated successfully.",
    address,
  });
});
