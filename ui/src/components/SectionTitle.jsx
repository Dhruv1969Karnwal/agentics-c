export default function SectionTitle({ children, className = '', ...props }) {
  return (
    <h3
      className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${className}`}
      style={{ color: 'var(--c-text2)', letterSpacing: '0.05em' }}
      {...props}
    >
      {children}
    </h3>
  )
}
