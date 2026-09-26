import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ShieldCheck, Building2, UserCheck, ArrowRight, AlertCircle, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const { t } = useLanguage();
  const [role, setRole] = useState("officer"); // officer | vendor
  const [email, setEmail] = useState("officer@procurement.gov.in");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleSwitch = (selectedRole) => {
    setRole(selectedRole);
    setError("");
    if (selectedRole === "officer") {
      setEmail("officer@procurement.gov.in");
      setPassword("Password123!");
    } else {
      setEmail("vendor@acme.com");
      setPassword("Password123!");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      const userRole = res?.user?.role || role;
      if (userRole === "vendor") {
        navigate("/vendor/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || t("login.invalidCredentials"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="gov-strip">
        <div>{t("login.govStrip")}</div>
        <div className="gov-strip-right">
          <span>भारत सरकार</span>
          <span>{t("login.helpdesk")}</span>
        </div>
      </div>

      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="login-brand">
              <img src="/gem-mark.png" alt={t("login.logoAlt")} className="login-logo" />
              <div>
                <h2>{t("login.brandTitle")}</h2>
                <p>{t("login.brandSubtitle")}</p>
              </div>
            </div>
          </div>

          <div className="portal-tabs">
            <button
              type="button"
              className={`portal-tab ${role === "officer" ? "active" : ""}`}
              onClick={() => handleRoleSwitch("officer")}
            >
              <ShieldCheck size={18} />
              <span>{t("login.officerPortal")}</span>
            </button>
            <button
              type="button"
              className={`portal-tab ${role === "vendor" ? "active" : ""}`}
              onClick={() => handleRoleSwitch("vendor")}
            >
              <Building2 size={18} />
              <span>{t("login.vendorPortal")}</span>
            </button>
          </div>

          <div className="login-body">
            <div className="role-badge-container">
              <span className={`role-badge ${role}`}>
                {role === "officer" ? t("login.officerRole") : t("login.vendorRole")}
              </span>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email">{t("login.emailLabel")}</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={role === "officer" ? "officer@procurement.gov.in" : "vendor@acme.com"}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">{t("login.passwordLabel")}</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="submit-btn">
                {isSubmitting ? (
                  t("login.signingIn")
                ) : (
                  <>
                    <span>{t("login.signInTo")} {role === "officer" ? t("login.officerPortal") : t("login.vendorPortal")}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="quick-demo-section">
              <p className="demo-title">{t("login.quickDemoTitle")}</p>
              <div className="demo-buttons">
                <button
                  type="button"
                  className="demo-btn officer"
                  onClick={() => {
                    handleRoleSwitch("officer");
                  }}
                >
                  <UserCheck size={14} /> {t("login.fillOfficerCredentials")}
                </button>
                <button
                  type="button"
                  className="demo-btn vendor"
                  onClick={() => {
                    handleRoleSwitch("vendor");
                  }}
                >
                  <Building2 size={14} /> {t("login.fillVendorCredentials")}
                </button>
              </div>
            </div>
          </div>

          <div className="login-footer">
            <span>{t("login.secureConnection")}</span>
            <span>{t("login.nicCompliance")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
