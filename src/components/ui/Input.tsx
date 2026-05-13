'use client';

import { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900',
          'placeholder:text-neutral-400',
          'transition-all duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
          error
            ? 'border-error focus-visible:ring-error/30'
            : 'border-neutral-300 hover:border-neutral-400 focus-visible:border-accent focus-visible:ring-accent/25',
          props.disabled && 'cursor-not-allowed bg-neutral-100 opacity-60',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
