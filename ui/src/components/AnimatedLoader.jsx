export default function AnimatedLoader({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" role="status" aria-live="polite">
      <div style={{ opacity: 0.9 }} aria-hidden="true">
        <img src="/assets/codemate.ico" alt="" className="w-10 h-10 animate-pulse" />
      </div>
      {label && (
        <span className="text-sm" style={{ color: 'var(--c-text2)' }}>{label}</span>
      )}
    </div>
  )
}
