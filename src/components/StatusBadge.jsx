import { statusConfig } from '../data/constants';

export default function StatusBadge({ status }) {
  const config = statusConfig[status];
  if (!config) return null;
  return (
    <span className={`badge ${
      status === 'normal' ? 'bg-status-normal-bg text-status-normal' : 
      status === 'attention' ? 'bg-status-attention-bg text-status-attention' : 
      'bg-status-complication-bg text-status-complication'
    }`}>
      {config.icon} {config.label}
    </span>
  );
}
