export default function SectionTitle({ children, icon: Icon, className = '' }) {
  return (
    <h4 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-4 ${className}`} style={{ color: 'var(--color-text-2)' }}>
      {Icon && <Icon size={14} style={{ color: 'var(--color-accent)' }} />}
      {children}
    </h4>
  )
}
