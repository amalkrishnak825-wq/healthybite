import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Save,
  UserRound,
} from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { getImageUrl } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";
import "cropperjs/dist/cropper.css";
import "../styles/AppPages.css";
import "../styles/AuthFormError.css";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPassword, setShowPassword] = useState({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [cropSource, setCropSource] = useState("");
  const [cropReady, setCropReady] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const cropImageRef = useRef(null);
  const cropperRef = useRef(null);

  function closeCropper() {
    cropperRef.current?.destroy();
    cropperRef.current = null;
    setCropReady(false);
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource("");
  }

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const response = await api.patch("/profile/me", { name, phone });
      setUser({ ...user, ...response.data.user });
      setFeedback({ type: "success", message: "Profile updated." });
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  function selectPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({
        type: "error",
        message: "Choose a JPG, PNG, or WEBP image.",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: "Profile photos must be 2 MB or smaller.",
      });
      return;
    }
    setFeedback(null);
    setCropSource(URL.createObjectURL(file));
  }

  function initializeCropper(event) {
    const image = event.currentTarget;
    cropperRef.current?.destroy();
    setCropReady(false);
    import("cropperjs")
      .then(({ default: Cropper }) => {
        if (!image.isConnected) return;
        cropperRef.current = new Cropper(image, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: "move",
          autoCropArea: 0.9,
          responsive: true,
          background: false,
          guides: true,
          center: true,
          movable: true,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
          ready: () => setCropReady(true),
        });
      })
      .catch(() =>
        setFeedback({
          type: "error",
          message:
            "Could not open the photo cropper. Please try another image.",
        }),
      );
  }

  async function uploadCroppedPhoto() {
    const canvas = cropperRef.current?.getCroppedCanvas({
      width: 512,
      height: 512,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (!canvas) return;
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9),
    );
    if (!blob) {
      setFeedback({
        type: "error",
        message: "Could not crop this photo. Please try another image.",
      });
      return;
    }
    const data = new FormData();
    data.append(
      "photo",
      new File([blob], "profile-photo.webp", { type: "image/webp" }),
    );
    setPhotoBusy(true);
    setFeedback(null);
    let uploadedSuccessfully = false;
    try {
      const response = await api.post("/profile/photo", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser({ ...user, profileImage: response.data.profileImage });
      setFeedback({ type: "success", message: "Profile photo updated." });
      uploadedSuccessfully = true;
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    } finally {
      setPhotoBusy(false);
    }
    if (uploadedSuccessfully) closeCropper();
  }

  async function requestEmail(event) {
    event.preventDefault();
    setFeedback(null);
    try {
      await api.post("/profile/change-email/request", { newEmail });
      setEmailSent(true);
      setFeedback({
        type: "success",
        message: "A verification code was sent to your new email.",
      });
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  }

  async function verifyEmail(event) {
    event.preventDefault();
    setFeedback(null);
    try {
      const response = await api.post("/profile/change-email/verify", {
        newEmail,
        otp,
      });
      setUser({ ...user, ...response.data.user });
      setEmailSent(false);
      setNewEmail("");
      setOtp("");
      setFeedback({
        type: "success",
        message: "Email address updated and verified.",
      });
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setFeedback(null);
    setPasswordErrors({});
    try {
      await api.patch("/profile/change-password", password);
      navigate("/login", {
        replace: true,
        state: { notice: "Password changed. Sign in with your new password." },
      });
    } catch (error) {
      const message = getErrorMessage(error);
      const normalized = message.toLowerCase();
      const field = normalized.includes("current password")
        ? "currentPassword"
        : normalized.includes("new password") && normalized.includes("match")
          ? "confirmPassword"
          : normalized.includes("new password")
            ? "newPassword"
            : "currentPassword";
      setPasswordErrors({ [field]: message });
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">✳</span> healthy<span>bite</span>
        </Link>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/account">My account</Link>
        </nav>
      </header>
      <main className="form-page">
        <Link className="back-link" to="/account">
          <ArrowLeft size={16} /> Back to account
        </Link>
        <div className="eyebrow">YOUR DETAILS</div>
        <h1>Profile settings</h1>
        <p className="muted">
          A few details help us make HealthyBite feel like yours.
        </p>
        {feedback && (
          <div
            className={
              feedback.type === "error"
                ? "auth-form-error"
                : "auth-form-success"
            }
            role={feedback.type === "error" ? "alert" : "status"}
          >
            {feedback.type === "error" ? (
              <CircleAlert size={17} />
            ) : (
              <CircleCheck size={17} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
        <div className="settings-grid">
          <section className="panel settings-panel">
            <h2>Personal information</h2>
            <div className="profile-photo-row">
              <div className="avatar large">
                {user?.profileImage ? (
                  <img src={getImageUrl(user.profileImage)} alt="Profile" />
                ) : (
                  <UserRound />
                )}
              </div>
              <label className="outline-button upload-button">
                <Camera size={16} /> Change photo
                <input type="file" accept="image/*" onChange={selectPhoto} />
              </label>
            </div>
            <form onSubmit={saveProfile} className="stack-form">
              <label>
                Full name
                <input
                  required
                  minLength="2"
                  maxLength="50"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Phone number
                <input
                  required
                  pattern="[6-9][0-9]{9}"
                  title="Enter a valid 10-digit Indian mobile number"
                  inputMode="numeric"
                  maxLength="10"
                  value={phone}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                />
              </label>
              <label>
                Email address
                <input value={user?.email || ""} disabled />
              </label>
              <button className="primary-button" disabled={busy}>
                <Save size={16} /> Save changes
              </button>
            </form>
          </section>
          <div className="settings-side">
            <section className="panel settings-panel">
              <div className="settings-title-icon">
                <Mail size={18} />
                <h2>Change email</h2>
              </div>
              <p className="muted small">
                We’ll send a one-time code to your new email.
              </p>
              <form
                onSubmit={emailSent ? verifyEmail : requestEmail}
                className="stack-form"
              >
                <label>
                  New email
                  <input
                    required
                    type="email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                {emailSent && (
                  <label>
                    6-digit verification code
                    <input
                      required
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength="6"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value)}
                    />
                  </label>
                )}
                <button className="outline-button">
                  {emailSent ? "Verify new email" : "Send verification code"}
                </button>
              </form>
            </section>
            <section className="panel settings-panel">
              <div className="settings-title-icon">
                <KeyRound size={18} />
                <h2>Change password</h2>
              </div>
              <form onSubmit={changePassword} className="stack-form">
                <label>
                  Current password
                  <span className="profile-password-input">
                    <input
                      required
                      type={showPassword.currentPassword ? "text" : "password"}
                      value={password.currentPassword}
                      aria-invalid={Boolean(passwordErrors.currentPassword)}
                      aria-describedby={
                        passwordErrors.currentPassword
                          ? "current-password-error"
                          : undefined
                      }
                      onChange={(event) => {
                        setPassword({
                          ...password,
                          currentPassword: event.target.value,
                        });
                        setPasswordErrors((current) => ({
                          ...current,
                          currentPassword: "",
                        }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => ({
                          ...current,
                          currentPassword: !current.currentPassword,
                        }))
                      }
                      aria-label={
                        showPassword.currentPassword
                          ? "Hide current password"
                          : "Show current password"
                      }
                    >
                      {showPassword.currentPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </span>
                  {passwordErrors.currentPassword && (
                    <small
                      className="profile-field-error"
                      id="current-password-error"
                      role="alert"
                    >
                      {passwordErrors.currentPassword}
                    </small>
                  )}
                </label>
                <label>
                  New password
                  <span className="profile-password-input">
                    <input
                      required
                      minLength="8"
                      type={showPassword.newPassword ? "text" : "password"}
                      value={password.newPassword}
                      aria-invalid={Boolean(passwordErrors.newPassword)}
                      aria-describedby={
                        passwordErrors.newPassword
                          ? "new-password-error"
                          : undefined
                      }
                      onChange={(event) => {
                        setPassword({
                          ...password,
                          newPassword: event.target.value,
                        });
                        setPasswordErrors((current) => ({
                          ...current,
                          newPassword: "",
                        }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => ({
                          ...current,
                          newPassword: !current.newPassword,
                        }))
                      }
                      aria-label={
                        showPassword.newPassword
                          ? "Hide new password"
                          : "Show new password"
                      }
                    >
                      {showPassword.newPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </span>
                  {passwordErrors.newPassword && (
                    <small
                      className="profile-field-error"
                      id="new-password-error"
                      role="alert"
                    >
                      {passwordErrors.newPassword}
                    </small>
                  )}
                </label>
                <label>
                  Confirm new password
                  <span className="profile-password-input">
                    <input
                      required
                      minLength="8"
                      type={showPassword.confirmPassword ? "text" : "password"}
                      value={password.confirmPassword}
                      aria-invalid={Boolean(passwordErrors.confirmPassword)}
                      aria-describedby={
                        passwordErrors.confirmPassword
                          ? "confirm-password-error"
                          : undefined
                      }
                      onChange={(event) => {
                        setPassword({
                          ...password,
                          confirmPassword: event.target.value,
                        });
                        setPasswordErrors((current) => ({
                          ...current,
                          confirmPassword: "",
                        }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => ({
                          ...current,
                          confirmPassword: !current.confirmPassword,
                        }))
                      }
                      aria-label={
                        showPassword.confirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showPassword.confirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </span>
                  {passwordErrors.confirmPassword && (
                    <small
                      className="profile-field-error"
                      id="confirm-password-error"
                      role="alert"
                    >
                      {passwordErrors.confirmPassword}
                    </small>
                  )}
                </label>
                <button className="outline-button" disabled={busy}>
                  Update password
                </button>
              </form>
            </section>
          </div>
        </div>
        {cropSource && (
          <div
            className="profile-crop-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !photoBusy)
                closeCropper();
            }}
          >
            <section
              className="profile-crop-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-crop-title"
            >
              <header>
                <div>
                  <h2 id="profile-crop-title">Crop profile photo</h2>
                  <p>Move and zoom the image to fit the square frame.</p>
                </div>
                <button
                  type="button"
                  aria-label="Cancel photo crop"
                  disabled={photoBusy}
                  onClick={closeCropper}
                >
                  ×
                </button>
              </header>
              <div className="profile-crop-preview">
                <img
                  ref={cropImageRef}
                  src={cropSource}
                  alt="Profile photo crop preview"
                  onLoad={initializeCropper}
                />
              </div>
              <p className="profile-crop-help">
                Your photo will be saved as a square image for a consistent
                profile appearance.
              </p>
              <footer>
                <button
                  type="button"
                  className="outline-button"
                  disabled={photoBusy}
                  onClick={closeCropper}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!cropReady || photoBusy}
                  onClick={uploadCroppedPhoto}
                >
                  {photoBusy
                    ? "Uploading…"
                    : cropReady
                      ? "Crop & save"
                      : "Preparing crop…"}
                </button>
              </footer>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
