import AnimatedLogo from './AnimatedLogo'

export default function AnimatedLoader({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div style={{ opacity: 0.7 }}>
        <AnimatedLogo size={32} />
      </div>
      {label && (
        <span className="text-[12px]" style={{ color: 'var(--c-text3)' }}>{label}</span>
      )}
    </div>
  )
}
