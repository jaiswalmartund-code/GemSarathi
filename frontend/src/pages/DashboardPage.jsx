import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/apiClient";
import { subscribeToTable, isRealtimeEnabled } from "../lib/supabase";
import { useLanguage } from "../context/LanguageContext";
import { ArrowRight, ArrowUpRight, FolderOpen, UsersRound, ShieldCheck, Sparkles, Activity, FileText } from "lucide-react";

export default function Dashboard() {
  const { t } = useLanguage();
  const services = [
    { icon: FolderOpen, label: t("dash.svcEvalLabel"), text: t("dash.svcEvalText"), to: "/tenders", tone: "blue" },
    { icon: UsersRound, label: t("dash.svcVendorsLabel"), text: t("dash.svcVendorsText"), to: "/vendors", tone: "green" },
  ];
  const [stats, setStats] = useState({ tenders: 0, evaluations: 0, in_progress: 0, needs_review: 0, awards: 0 });
  const [tenders, setTenders] = useState([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [dashRes, tendRes] = await Promise.allSettled([
          apiRequest("/officer/dashboard"),
          apiRequest("/tenders"),
        ]);

        if (dashRes.status === "fulfilled" && dashRes.value) {
          setStats(dashRes.value);
        }
        if (tendRes.status === "fulfilled" && Array.isArray(tendRes.value)) {
          setTenders(tendRes.value);
        }
      } catch (err) {
        console.error("Dashboard fetch failed", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
    // Live updates when Supabase Realtime is configured: a vendor submitting
    // a bid on another device refreshes this dashboard with no reload.
    if (!isRealtimeEnabled()) return undefined;
    const refresh = () => loadDashboardData();
    const offBids = subscribeToTable("bids", refresh);
    const offEvals = subscribeToTable("evaluations", refresh);
    return () => { offBids(); offEvals(); };
  }, []);

  return (
    <AppShell>
      <section className="welcome-hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> {t("heroEyebrow")}
          </div>
          <h1>
            {t("heroTitleLine1")}<br />
            <em>{t("heroTitleLine2")}</em>
          </h1>
          <p>{t("heroSubtitle")}</p>
          <div className="hero-actions">
            <Link to="/tenders" className="primary-action">
              <FolderOpen size={18} /> {t("exploreEvaluations")} <ArrowRight size={16} />
            </Link>
            <Link to="/vendors" className="secondary-action">
              <UsersRound size={18} /> {t("navVendors")} <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="portal-home">
        <div className="portal-heading">
          <div>
            <div className="section-kicker">{t("procurementWorkspace")}</div>
            <h2>{t("yourWorkspace")}</h2>
          </div>
          <div className="portal-date">
            <span className="live-dot" /> {isRealtimeEnabled() ? t("liveSyncConnected") : t("systemOperational")}
          </div>
        </div>

        <div className="command-layout">
          <div className="services-surface">
            <div className="surface-heading">
              <div>
                <span className="surface-index">01</span>
                <div>
                  <div className="section-kicker">{t("dash.coreServices")}</div>
                  <h3>{t("dash.whatToday")}</h3>
                </div>
              </div>
              <span className="surface-caption">{t("dash.clearStart")}</span>
            </div>
            <div className="service-tiles">
              {services.map(({ icon: Icon, label, text, to, tone }) => (
                <Link className={`service-tile ${tone}`} to={to} key={label}>
                  <div className="tile-icon">
                    <Icon size={21} />
                  </div>
                  <div className="tile-copy">
                    <h4>{label}</h4>
                    <p>{text}</p>
                  </div>
                  <ArrowUpRight size={16} className="tile-arrow" />
                </Link>
              ))}
            </div>
          </div>

          <aside className="insight-stack">
            <div className="today-card">
              <div className="today-top">
                <span className="surface-index">02</span>
                <span className="section-kicker">{t("dash.dataStatus")}</span>
              </div>
              <div className="today-number">{stats.needs_review}</div>
              <h3>{t("dash.needingReview")}</h3>
              <p>{t("dash.needingReviewDesc")}</p>
              <Link to="/tenders" className="light-link">
                {t("dash.openEvaluations")} <ArrowRight size={14} />
              </Link>
              <div className="review-foot">
                <span>{t("dash.humanLoop")}</span>
                <span>{t("dash.activeDb")}</span>
              </div>
            </div>
          </aside>
        </div>

        <section className="evaluations-surface">
          <div className="surface-heading evaluations-heading">
            <div>
              <span className="surface-index">03</span>
              <div>
                <div className="section-kicker">{t("dash.workspaceActivity")}</div>
                <h3>{t("dash.recentTitle")}</h3>
              </div>
            </div>
            <Link to="/tenders" className="surface-link">
              {t("dash.viewAll")} <ArrowRight size={15} />
            </Link>
          </div>
          <div className="activity-strip">
            <div>
              <FileText size={16} />
              <b>{stats.tenders}</b>
              <span>{t("dash.totalTenders")}</span>
            </div>
            <div>
              <Activity size={16} />
              <b>{stats.evaluations}</b>
              <span>{t("dash.activeEvaluations")}</span>
            </div>
            <div>
              <ShieldCheck size={16} />
              <b>{stats.awards}</b>
              <span>{t("dash.awardedContracts")}</span>
            </div>
            <div className="activity-note">
              <Activity size={16} />
              <span>
                {t("dash.dbSync")}<br />
                <b>{t("dash.operational")}</b>
              </span>
            </div>
          </div>

          <div className="table-wrap">
            {tenders.length === 0 ? (
              <div className="empty-state">
                <FileText size={22} />
                <h3>{t("dash.noTendersTitle")}</h3>
                <p>{t("dash.noTendersDesc")}</p>
              </div>
            ) : (
              <table className="evaluations-table">
                <thead>
                  <tr>
                    <th>{t("dash.colRef")}</th>
                    <th>{t("dash.colTitle")}</th>
                    <th>{t("dash.colDept")}</th>
                    <th>{t("dash.colStatus")}</th>
                    <th>{t("dash.colDeadline")}</th>
                    <th>{t("dash.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tenders.map((tender) => (
                    <tr key={tender.id || tender._id}>
                      <td>
                        <strong>{tender.referenceNumber || tender.tenderRef || tender.id}</strong>
                      </td>
                      <td>{tender.title || tender.name}</td>
                      <td>{tender.department}</td>
                      <td>
                        <StatusBadge status={tender.status} />
                      </td>
                      <td>
                        {tender.submissionDeadline || tender.deadline
                          ? new Date(tender.submissionDeadline || tender.deadline).toLocaleDateString()
                          : t("dash.na")}
                      </td>
                      <td>
                        <Link to={`/tenders/${tender.id || tender._id}`} className="table-action-link">
                          {t("dash.viewTender")} <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <div className="accountability-banner">
          <div className="accountability-symbol">
            <Sparkles size={18} />
          </div>
          <div>
            <b>{t("dash.evidenceTitle")}</b>
            <span>{t("dash.evidenceDesc")}</span>
          </div>
          <Link to="/tenders">{t("dash.exploreEvidence")} <ArrowRight size={15} /></Link>
        </div>
      </section>
    </AppShell>
  );
}