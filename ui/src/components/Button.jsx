import React from 'react'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: `
      bg-[var(--color-accent)]
      text-white
      border-2 border-[var(--color-accent)]
      hover:bg-[var(--color-accent-dim)]
      hover:border-[var(--color-accent-dim)]
      focus:ring-[var(--color-accent)]
      focus:ring-offset-[var(--color-bg)]
    `,
    secondary: `
      bg-[var(--color-bg-3)]
      text-[var(--color-text)]
      border-2 border-[var(--color-border)]
      hover:bg-[var(--color-bg-4)]
      hover:border-[var(--color-border-2)]
      focus:ring-[var(--color-text-4)]
      focus:ring-offset-[var(--color-bg)]
    `,
    ghost: `
      bg-transparent
      text-[var(--color-text-2)]
      border-2 border-transparent
      hover:bg-[var(--color-bg-3)]
      hover:text-[var(--color-text)]
      focus:ring-[var(--color-text-4)]
      focus:ring-offset-[var(--color-bg)]
    `,
    accent: `
      bg-[var(--color-accent-subtle)]
      text-[var(--color-accent-light)]
      border-2 border-[var(--color-accent-subtle)]
      hover:bg-[var(--color-accent)]
      hover:text-white
      focus:ring-[var(--color-accent)]
      focus:ring-offset-[var(--color-bg)]
    `,
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl',
    xl: 'px-8 py-4 text-lg rounded-xl',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' || size === 'xl' ? 20 : 16} />}
      {children}
    </button>
  )
}
