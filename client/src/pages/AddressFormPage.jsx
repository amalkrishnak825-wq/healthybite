import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, Save } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import { lookupPincode } from "../api/addresses";
import FieldError from "../components/FieldError";
import {
  getIndianPhoneError,
  getIndianPincodeError,
  getNameError,
} from "../utils/validation";
import "../styles/AppPages.css";
import "../styles/AuthFormError.css";

const empty = {
  type: "Home",
  fullName: "",
  phone: "",
  houseNo: "",
  street: "",
  landmark: "",
  locality: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  isDefault: false,
};

export default function AddressFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/account";
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [phoneErrorDismissed, setPhoneErrorDismissed] = useState(false);
  const [pincodeErrorDismissed, setPincodeErrorDismissed] = useState(false);
  const skipInitialPincodeLookup = useRef(null);
  const fullNameError =
    touched.fullName || submitAttempted || form.fullName
      ? getNameError(form.fullName, { required: true, max: 80 })
      : "";
  const phoneError =
    touched.phone || submitAttempted || form.phone.length === 10
      ? getIndianPhoneError(form.phone)
      : "";
  const pincodeError =
    touched.pincode || submitAttempted
      ? getIndianPincodeError(form.pincode)
      : "";
  const visiblePhoneError = phoneErrorDismissed ? "" : phoneError;
  const visiblePincodeError = pincodeErrorDismissed ? "" : pincodeError;

  const applyPostalOffice = useCallback((office) => {
    if (!office) return;
    setForm((current) => ({
      ...current,
      locality: office.name || current.locality,
      city: office.district || current.city,
      state: office.state || current.state,
      country: office.country || current.country,
    }));
  }, []);

  useEffect(() => {
    if (!phoneError) return undefined;
    const timeout = window.setTimeout(() => setPhoneErrorDismissed(true), 5500);
    return () => window.clearTimeout(timeout);
  }, [phoneError, form.phone]);

  useEffect(() => {
    if (!pincodeError) return undefined;
    const timeout = window.setTimeout(() => setPincodeErrorDismissed(true), 5500);
    return () => window.clearTimeout(timeout);
  }, [pincodeError, form.pincode]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    api
      .get("/addresses")
      .then((response) => {
        const address = response.data.addresses.find((item) => item._id === id);
        if (active && address) {
          skipInitialPincodeLookup.current = address.pincode;
          setForm({ ...empty, ...address });
        }
        if (active && !address)
          setErrorMessage("We couldn't find that saved address.");
      })
      .catch((error) => {
        if (active) setErrorMessage(getErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (skipInitialPincodeLookup.current === form.pincode) {
      skipInitialPincodeLookup.current = null;
      return undefined;
    }
    if (getIndianPincodeError(form.pincode)) {
      return undefined;
    }

    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await lookupPincode(form.pincode, {
          signal: controller.signal,
        });
        if (!active) return;
        const offices = Array.isArray(result.postOffices)
          ? result.postOffices
          : [];
        if (!offices.length) return;
        applyPostalOffice(offices[0]);
      } catch {
        // Keep postal lookup failures silent; location fields remain editable.
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.pincode, applyPostalOffice]);

  function field(key) {
    return (event) => {
      setErrorMessage("");
      setForm((current) => ({
        ...current,
        [key]:
          event.target.type === "checkbox"
            ? event.target.checked
            : event.target.value,
      }));
    };
  }

  async function submit(event) {
    event.preventDefault();
    setErrorMessage("");
    setPhoneErrorDismissed(false);
    setPincodeErrorDismissed(false);
    setSubmitAttempted(true);
    if (
      getNameError(form.fullName, { required: true, max: 80 }) ||
      getIndianPhoneError(form.phone) ||
      getIndianPincodeError(form.pincode)
    ) {
      return;
    }

    setBusy(true);
    try {
      if (id) await api.patch(`/addresses/${id}`, form);
      else await api.post("/addresses", form);
      navigate(returnTo, {
        state: { notice: id ? "Address updated." : "Address saved." },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function handleFormKeyDown(event) {
    if (event.key !== "Enter") return;
    const currentField = event.target;
    if (
      !currentField.matches("input:not([type='checkbox']):not([type='hidden']), select")
    ) {
      return;
    }

    event.preventDefault();
    const fields = Array.from(
      event.currentTarget.querySelectorAll(
        "input:not([type='checkbox']):not([type='hidden']), select",
      ),
    ).filter((field) => !field.disabled);
    const currentIndex = fields.indexOf(currentField);

    if (currentIndex === fields.length - 1) {
      event.currentTarget.requestSubmit();
      return;
    }

    fields[currentIndex + 1]?.focus();
  }

  async function remove() {
    if (!window.confirm("Delete this saved address?")) return;
    setBusy(true);
    setErrorMessage("");
    try {
      await api.delete(`/addresses/${id}`);
      navigate(returnTo, { state: { notice: "Address deleted." } });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          <span className="brand-mark">✳</span> healthy<span>bite</span>
        </Link>
        <nav>
          <Link to="/account">My account</Link>
        </nav>
      </header>
      <main className="form-page narrow-form">
        <Link className="back-link" to={returnTo}>
          <ArrowLeft size={16} /> Back to account
        </Link>
        <div className="eyebrow">DELIVERY DETAILS</div>
        <h1>{id ? "Edit address" : "Add an address"}</h1>
        <p className="muted">
          Make sure your good things know where to find you.
        </p>
        <section className="panel settings-panel">
          <form
            className="stack-form address-form"
            onSubmit={submit}
            onKeyDown={handleFormKeyDown}
          >
            {errorMessage && (
              <div className="auth-form-error address-form-error" role="alert">
                <CircleAlert size={17} />
                <span>{errorMessage}</span>
              </div>
            )}
            <label>
              Address type
              <select value={form.type} onChange={field("type")}>
                <option>Home</option>
                <option>Work</option>
                <option>Other</option>
              </select>
            </label>
            <label className={fullNameError ? "address-field-invalid" : ""}>
              Full name
              <input
                required
                value={form.fullName}
                onChange={field("fullName")}
                aria-invalid={Boolean(fullNameError)}
                aria-describedby={fullNameError ? "address-name-error" : undefined}
                onBlur={() =>
                  setTouched((current) => ({ ...current, fullName: true }))
                }
              />
              <FieldError id="address-name-error" className="address-field-error" message={fullNameError} />
            </label>
            <label className={phoneError ? "address-field-invalid" : ""}>
              Phone number
              <input
                inputMode="numeric"
                maxLength="10"
                value={form.phone}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={visiblePhoneError ? "address-phone-error" : undefined}
                onChange={(event) =>
                  {
                    setErrorMessage("");
                    setPhoneErrorDismissed(false);
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                    }));
                  }
                }
                onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
              />
              <FieldError id="address-phone-error" className="address-field-error" message={visiblePhoneError} />
            </label>
            <label>
              House / flat / building
              <input
                required
                value={form.houseNo}
                onChange={field("houseNo")}
              />
            </label>
            <label>
              Street / area
              <input required value={form.street} onChange={field("street")} />
            </label>
            <label>
              Landmark (optional)
              <input value={form.landmark} onChange={field("landmark")} />
            </label>
            <label>
              City / district
              <input required value={form.city} onChange={field("city")} />
            </label>
            <label>
              State
              <input required value={form.state} onChange={field("state")} />
            </label>
            <label>
              Country
              <input value={form.country} onChange={field("country")} />
            </label>
            <label className={pincodeError ? "address-field-invalid" : ""}>
              PIN code
              <input
                inputMode="numeric"
                maxLength="6"
                value={form.pincode}
                aria-invalid={Boolean(pincodeError)}
                aria-describedby={visiblePincodeError ? "address-pincode-error" : undefined}
                onChange={(event) => {
                  setErrorMessage("");
                  setPincodeErrorDismissed(false);
                  skipInitialPincodeLookup.current = null;
                  setForm((current) => ({
                    ...current,
                    pincode: event.target.value.replace(/\D/g, "").slice(0, 6),
                  }));
                }}
                onBlur={() => setTouched((current) => ({ ...current, pincode: true }))}
              />
              <FieldError id="address-pincode-error" className="address-field-error" message={visiblePincodeError} />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={Boolean(form.isDefault)}
                onChange={field("isDefault")}
              />{" "}
              Set as my default address
            </label>
            <div className="form-actions">
              <button className="primary-button" disabled={busy}>
                <Save size={16} />
                {busy ? "Saving…" : "Save address"}
              </button>
              {id && (
                <button
                  className="danger-button"
                  type="button"
                  disabled={busy}
                  onClick={remove}
                >
                  Delete address
                </button>
              )}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
