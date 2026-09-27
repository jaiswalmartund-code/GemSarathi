import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, HelpCircle, Bell, ChevronDown, LogOut, UserCheck, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../services/apiClient";

const officerLinks = [
  { key: "navHome", to: "/" },
  { key: "navEvaluations", to: "/tenders" },
  { key: "navVendors", to: "/vendors" },
];

const vendorLinks = [
  { key: "vendorDashboard", to: "/vendor/dashboard", label: "Dashboard" },
  { key: "vendorTenders", to: "/vendor/tenders", label: "Open Tenders" },
  { key: "vendorBids", to: "/vendor/bids", label: "My Bids" },
];

export default function AppShell({ children, noPadding = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [headerQuery, setHeaderQuery] = useState("");
  const [vendorProfile, setVendorProfile] = useState(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isVendor = user?.role === "vendor";

  useEffect(() => {
    if (!isVendor) return undefined;
    let cancelled = false;
    apiRequest("/vendor/profile").then(profile => {
      if (!cancelled) setVendorProfile(profile);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isVendor]);

  const handleHeaderSearch = () => {
    const q = headerQuery.trim();
    if (!q || isVendor) return;
    navigate(`/tenders?q=${encodeURIComponent(q)}`);
  };
  const links = isVendor ? vendorLinks : officerLinks;
  const linkLabel = key => links.find(link => link.key === key)?.label || t(key);

  const displayName = isVendor
    ? vendorProfile?.company_name || vendorProfile?.legalName || vendorProfile?.companyName || user?.company_name || user?.companyName || user?.vendorName || user?.name || "Registered Vendor"
    : user?.name || "Arjun Sharma";
  const displayRole = isVendor ? "Registered Vendor" : "Procurement Officer";
  const avatarInitials = isVendor ? "AC" : "AS";

  return (
    <div className={`app-shell ${isVendor ? "vendor-app-shell" : ""}`}>
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
                    (link.key === "vendorTenders" && location.pathname.startsWith("/vendor/tenders")) ||
                    (link.key === "vendorBids" && location.pathname.startsWith("/vendor/bids")) ||
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
        </div>
      </nav>

      <main className={`${noPadding ? "app-main no-padding" : "app-main"} ${isVendor ? "vendor-app-main" : ""}`}>{children}</main>

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
