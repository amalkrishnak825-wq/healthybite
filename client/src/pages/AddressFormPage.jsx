import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, Save } from "lucide-react";
import api, { getErrorMessage } from "../api/axios";
import "../styles/AppPages.css";
import "../styles/AuthFormError.css";

const empty = {
  type: "Home",
  fullName: "",
  phone: "",
  houseNo: "",
  street: "",
  landmark: "",
  city: "",
  state: "",
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

  useEffect(() => {
    if (!id) return;
    let active = true;
    api
      .get("/addresses")
      .then((response) => {
        const address = response.data.addresses.find((item) => item._id === id);
        if (active && address) setForm({ ...empty, ...address });
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
    setBusy(true);
    setErrorMessage("");
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
          <form className="stack-form address-form" onSubmit={submit}>
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
            <label>
              Full name
              <input
                required
                value={form.fullName}
                onChange={field("fullName")}
              />
            </label>
            <label>
              Phone number
              <input
                required
                pattern="[6-9][0-9]{9}"
                inputMode="numeric"
                maxLength="10"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                  }))
                }
              />
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
              City
              <input required value={form.city} onChange={field("city")} />
            </label>
            <label>
              State
              <input required value={form.state} onChange={field("state")} />
            </label>
            <label>
              PIN code
              <input
                required
                pattern="[0-9]{6}"
                value={form.pincode}
                onChange={field("pincode")}
              />
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
