
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from "lucide-react";

export default function ResetSuccessPage() {
  return (
    <AuthLayout className="auth-success-page">
      <div className="auth-card">
        <div className="centered-auth-icon"><Check/></div>
        <span className="auth-success-tag">SECURITY CONFIRMED</span>
        <h1>Password Reset Successful!</h1>

        <p>
          Your password has been reset. You can now sign in with your new password.
        </p>
        <div className="auth-info-box"><LockKeyhole size={17}/>All previous active sessions have been safely terminated for your protection.</div>
        <Link to="/login" className="auth-button">
          Go to Sign In <ArrowRight size={15}/>
        </Link>
        <Link className="auth-back-link" to="/"><ArrowLeft size={14}/> Return to Home</Link>
        <div className="secure-note"><LockKeyhole size={13}/> END-TO-END ENCRYPTED ACCOUNT SESSION</div>
      </div>
    </AuthLayout>
  );
}
