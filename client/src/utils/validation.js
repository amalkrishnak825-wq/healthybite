const personNamePattern =
  /^[\p{L}\p{M}]+(?:[ '\u2019.-][\p{L}\p{M}]+)*$/u;
const emailPattern =
  /^[^\s@]{2,}@[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+$/i;

export function getNameError(value, { required = false, max = 50 } = {}) {
  const name = String(value ?? "").trim();
  if (!name) return required ? "Please enter your name." : "";
  if (name.length < 2 || name.length > max) {
    return `Your name must be between 2 and ${max} characters.`;
  }
  if (!personNamePattern.test(name)) {
    return "Use letters only. Spaces, hyphens, apostrophes, and periods are allowed.";
  }
  return "";
}

export function getEmailError(value, required = false) {
  const email = String(value ?? "").trim();
  if (!email) return required ? "Please enter your email address." : "";
  return emailPattern.test(email)
    ? ""
    : "Enter a valid email with at least 2 characters before @.";
}

export function getIndianPhoneError(value, required = true) {
  const phone = String(value ?? "").trim();
  if (!phone) return required ? "Enter a phone number." : "";
  return /^[6-9]\d{9}$/.test(phone)
    ? ""
    : "Enter a valid 10-digit mobile number starting with 6–9.";
}

export function getIndianPincodeError(value, required = true) {
  const pincode = String(value ?? "").trim();
  if (!pincode) return required ? "Enter a PIN code." : "";
  return /^[1-9]\d{5}$/.test(pincode)
    ? ""
    : "Enter a valid 6-digit PIN code starting with 1–9.";
}
