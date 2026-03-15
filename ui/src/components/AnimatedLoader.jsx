export default function AnimatedLoader({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div style={{ opacity: 0.9 }}>
        <img src="/assets/codemate.ico" alt="Loading..." className="w-10 h-10 animate-pulse" />
      </div>
      {label && (
        <span className="text-[12px]" style={{ color: 'var(--c-text3)' }}>{label}</span>
      )}
    </div>
  )
}
