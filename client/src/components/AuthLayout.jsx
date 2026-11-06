import Header from "./Header";
import Footer from "./Footer";
import "../styles/Auth.css";

export default function AuthLayout({ children, image, className = "" }) {
  return (
    <div
      className={`auth-layout ${image ? "auth-layout-split" : "auth-layout-centered"} ${className}`}
    >
      <Header />

      <main
        className={`auth-main ${image ? "auth-main-split" : "auth-main-centered"}`}
      >
        {image && (
          <aside className="auth-image">
            <img src={image} alt="A freshly prepared HealthyBite meal" />
          </aside>
        )}

        <section className="auth-content">{children}</section>
      </main>

      <Footer />
    </div>
  );
}
