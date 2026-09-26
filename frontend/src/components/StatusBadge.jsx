import { CheckCircle2, XCircle, AlertTriangle, Clock, HelpCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const CONFIG = {
  COMPLIANT:       { key: "common.compliant",       className: "badge badge-compliant",     Icon: CheckCircle2 },
  NON_COMPLIANT:   { key: "common.nonCompliant",   className: "badge badge-non-compliant", Icon: XCircle },
  FLAG_FOR_REVIEW: { key: "common.flagForReview", className: "badge badge-flag",          Icon: AlertTriangle },
  NOT_FOUND:       { key: "common.notFound",       className: "badge badge-not-found",     Icon: HelpCircle },
  PENDING:         { key: "common.pending",         className: "badge badge-pending",        Icon: Clock },
};

export default function StatusBadge({ status, size = "md" }) {
  const { t } = useLanguage();
  const { key, className, Icon } = CONFIG[status] ?? CONFIG.PENDING;
  const label = t(key);
  const iconSize = size === "sm" ? 10 : 11;
  const style = size === "sm" ? { fontSize: "10px", padding: "2px 8px" } : {};
  return (
    <span className={className} style={style}>
      <Icon size={iconSize} />
      {label}
    </span>
  );
}
