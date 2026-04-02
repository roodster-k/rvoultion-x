export default function NavItem({ icon, label, active, onClick, collapsed }) {
  return (
    <button onClick={onClick} className={`
      flex items-center w-full border-none rounded-xl cursor-pointer transition-all duration-200 text-sm
      ${collapsed ? 'gap-0 justify-center py-3 px-0' : 'gap-3 justify-start py-2.5 px-4'}
      ${active ? 'bg-primary-light text-primary font-bold' : 'bg-transparent text-text-muted font-medium hover:bg-slate-50'}
    `}>
      <span className="flex items-center justify-center w-6 text-lg">
        {icon}
      </span>
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
