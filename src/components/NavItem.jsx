export default function NavItem({ icon, label, active, onClick, collapsed }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: collapsed ? 0 : 12,
      justifyContent: collapsed ? "center" : "flex-start",
      width: "100%", padding: collapsed ? "12px 0" : "11px 16px",
      border: "none", borderRadius: 10, cursor: "pointer",
      background: active ? "var(--color-primary-light)" : "transparent",
      color: active ? "var(--color-primary)" : "var(--text-muted)",
      fontWeight: active ? 700 : 500, fontSize: 14,
      transition: "all 0.2s",
    }}>
      <span style={{ fontSize: 18, width: 24, textAlign: "center", display: "inline-block" }}>
        {icon}
      </span>
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
