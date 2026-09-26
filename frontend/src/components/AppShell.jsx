import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, HelpCircle, Bell, ChevronDown, RefreshCw, LogOut, UserCheck, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const officerLinks = [
  { key: "navHome", to: "/" },
  { key: "navEvaluations", to: "/tenders" },
  { key: "navVendors", to: "/vendors" },
];

const vendorLinks = [
  { key: "vendorWorkspace", to: "/vendor/dashboard" },
];

export default function AppShell({ children, noPadding = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [headerQuery, setHeaderQuery] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isVendor = user?.role === "vendor";

  const handleHeaderSearch = () => {
    const q = headerQuery.trim();
    if (!q || isVendor) return;
    navigate(`/tenders?q=${encodeURIComponent(q)}`);
  };
  const links = isVendor ? vendorLinks : officerLinks;
  const linkLabel = key => (key === "vendorWorkspace" ? "Vendor Workspace" : t(key));

  const displayName = user?.name || (isVendor ? "Acme Procurement Systems" : "Arjun Sharma");
  const displayRole = isVendor ? "Registered Vendor" : "Procurement Officer";
  const avatarInitials = isVendor ? "AC" : "AS";

  return (
    <div className="app-shell">
      <div className="gov-strip">
        <div>{t("govStrip")}</div>
        <div className="gov-strip-right">
          <span>{t("bharatSarkar")}</span>
          <span>{t("skipToContent")}</span>
          <span>अ | A</span>
        </div>
      </div>

      <header className="site-header">
        <Link to={isVendor ? "/vendor/dashboard" : "/"} className="brand-lockup">
          <div className="brand-mark">
            <img src="/gem-mark.png" alt="GeM" />
          </div>
          <div className="brand-copy">
            <strong>GeM</strong>
            <span>{t("brandTagline")}</span>
          </div>
          <div className="brand-divider" />
          <div className="brand-dept">
            <b>{t("brandDept")}</b>
            <span>{t("brandDeptTagline")}</span>
          </div>
        </Link>

        <div className="header-tools">


          <button className="icon-button" aria-label="Help">
            <HelpCircle size={19} />
          </button>

          <button className="icon-button notification" aria-label="Notifications">
            <Bell size={18} />
            <i />
          </button>

          <button className="language" onClick={toggleLanguage} title="Switch language">
            <span>अ</span> {language === "hi" ? "हिंदी" : "English"} <ChevronDown size={14} />
          </button>

          {user ? (
            <div className="header-profile-box">
              <div className="profile-pill">
                <div className="avatar">{avatarInitials}</div>
                <div className="profile-info">
                  <b className="user-name">{displayName}</b>
                  <span className="user-role">{displayRole}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="header-logout-btn" title="Sign Out">
                <LogOut size={15} />
                <span>{t("logout")}</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="login-link-btn">
              {t("signIn")}
            </Link>
          )}
        </div>
      </header>

      <nav className="top-nav">
        <div className="nav-inner">
          <div className="nav-links">
            {links.map((link) => (
              <Link
                key={link.key}
                className={
                  (link.key === "navEvaluations" && location.pathname.startsWith("/tenders")) ||
                    (link.key !== "navVendors" && link.key !== "navEvaluations" && location.pathname === link.to)
                    ? "active"
                    : ""
                }
                to={link.to}
              >
                {linkLabel(link.key)}
                {link.key === "navEvaluations" && <ChevronDown size={14} />}
              </Link>
            ))}
          </div>

          <div className="nav-right-controls">
            <div className="nav-status">
              <span className="status-dot" /> {t("engineOperational")} <RefreshCw size={13} />
            </div>
            {user && (
              <button onClick={handleLogout} className="navbar-logout-btn">
                <LogOut size={13} /> {t("logout")} ({user.email})
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className={noPadding ? "app-main no-padding" : "app-main"}>{children}</main>

      <footer className="site-footer">
        <div>
          <b>{t("footerTitle")}</b>
          <span>{t("footerTagline")}</span>
        </div>
        <div className="footer-links">
          <span>{t("privacy")}</span>
          <span>{t("helpSupport")}</span>
          <span>{t("version")}</span>
        </div>
      </footer>
    </div>
  );
}