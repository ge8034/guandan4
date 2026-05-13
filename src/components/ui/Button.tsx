'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-light active:bg-accent-dark shadow-sm hover:shadow-md',
  secondary:
    'bg-neutral-800 text-white hover:bg-neutral-700 active:bg-neutral-900',
  outline:
    'border border-neutral-300 text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
  ghost:
    'text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-5 py-2 text-sm rounded-lg',
  lg: 'px-7 py-3 text-base rounded-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 font-medium',
        'transition-all duration-150 ease-out',
        'active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'touch-target select-none',
        isDisabled && 'cursor-not-allowed opacity-50 active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={isDisabled}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/* 内联 Spinner 避免循环依赖 */
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
