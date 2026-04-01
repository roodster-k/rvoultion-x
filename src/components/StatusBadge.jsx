import { statusConfig } from '../data/mockData';

export default function StatusBadge({ status }) {
  const c = statusConfig[status] || statusConfig.normal;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      color: c.color, background: c.bg, border: `1px solid ${c.color}22`,
      letterSpacing: 0.3,
    }}>
      <span style={{ fontSize: 10 }}>{c.icon}</span> {c.label}
    </span>
  );
}
