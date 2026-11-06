import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { CircleAlert } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/AuthFormError.css";

export default function GoogleButton() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSuccess(credentialResponse) {
    setErrorMessage("");
    try {
      const response = await api.post("/auth/google", {
        credential: credentialResponse.credential,
      });

      setUser(response.data.user);
      navigate("/account", { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="google-login-wrap">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() =>
          setErrorMessage("Google sign-in failed. Please try again.")
        }
        text="continue_with"
        shape="rectangular"
        width="320"
      />
      {errorMessage && (
        <div className="auth-form-error" role="alert">
          <CircleAlert size={17} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
