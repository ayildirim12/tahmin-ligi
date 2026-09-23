import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'google'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-surface-muted text-foreground hover:bg-border',
  ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  // Follows Google's official sign-in button guidelines (light/dark neutral surface,
  // not the app's brand color) — recoloring the Google button breaks their brand rules.
  google:
    'border border-[#747775] bg-white text-[#1f1f1f] shadow-sm hover:bg-[#f7f8f8] dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1e1f20]',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-[color,background-color,filter,transform] active:scale-95 disabled:pointer-events-none disabled:bg-surface-muted disabled:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        variant === 'google' ? '' : 'hover:brightness-110 active:brightness-95',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
}
