
const VERIFY_KEY = "hb_verify";
const RESET_KEY = "hb_reset";
const RESET_TOKEN_KEY = "hb_reset_token";

export const pending = {
  getVerify() {
    return sessionStorage.getItem(VERIFY_KEY) || "";
  },

  setVerify(email) {
    sessionStorage.setItem(VERIFY_KEY, email);
  },

  setRegistration(data) {
    sessionStorage.setItem("hb_registration", JSON.stringify(data));
  },

  getRegistration() {
    try { return JSON.parse(sessionStorage.getItem("hb_registration") || "null"); }
    catch { return null; }
  },

  clearVerify() {
    sessionStorage.removeItem(VERIFY_KEY);
    sessionStorage.removeItem("hb_registration");
  },

  getReset() {
    return sessionStorage.getItem(RESET_KEY) || "";
  },

  setReset(email) {
    sessionStorage.setItem(RESET_KEY, email);
  },

  clearReset() {
    sessionStorage.removeItem(RESET_KEY);
  },

  getResetToken() {
    return sessionStorage.getItem(RESET_TOKEN_KEY) || "";
  },

  setResetToken(token) {
    sessionStorage.setItem(RESET_TOKEN_KEY, token);
  },

  clearResetToken() {
    sessionStorage.removeItem(RESET_TOKEN_KEY);
  },
};
