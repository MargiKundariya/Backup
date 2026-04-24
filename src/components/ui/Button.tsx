'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  primary: 'bg-accent hover:bg-accent-hover text-white shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary: 'bg-surface-hover hover:bg-border-subtle text-text-primary border border-border',
  ghost: 'bg-transparent hover:bg-surface-hover text-text-secondary',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-[0.98]',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center rounded-lg font-semibold
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
