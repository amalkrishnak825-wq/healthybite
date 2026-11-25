import api from "./axios";

export async function lookupPincode(pincode, config = {}) {
  const response = await api.get(
    `/addresses/pincode/${encodeURIComponent(pincode)}`,
    config,
  );
  return response.data;
}
