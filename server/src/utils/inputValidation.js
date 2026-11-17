const personNamePattern =
  /^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u;

export const isValidPersonName = (value, { min = 2, max = 50 } = {}) => {
  if (typeof value !== "string") return false;
  const name = value.trim();
  return name.length >= min && name.length <= max && personNamePattern.test(name);
};

export const isValidIndianPhone = (value) =>
  typeof value === "string" && /^[6-9]\d{9}$/.test(value.trim());

export const isValidIndianPincode = (value) =>
  typeof value === "string" && /^[1-9]\d{5}$/.test(value.trim());
