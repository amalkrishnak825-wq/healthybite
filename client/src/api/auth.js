import api from "./axios";
import { pending } from "../utils/pending";

export async function sendVerificationOtp(email) {
  try {
    const response = await api.post("/auth/resend-otp", { email });

    pending.setVerify(email);

    return response.data;
  } catch (error) {
    pending.setVerify(email);
    throw error;
  }
}
