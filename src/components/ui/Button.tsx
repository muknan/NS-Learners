import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import Link from 'next/link';

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: ReactNode;
}

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, 'href'> {
  href: string;
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function Button({
  className = '',
  tone = 'primary',
  size = 'md',
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClassName(tone, size, className)} type="button" {...props}>
      {icon ? <span className="button__icon">{icon}</span> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

export function ButtonLink({
  className = '',
  tone = 'primary',
  size = 'md',
  icon,
  children,
  href,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName(tone, size, className)} href={href} {...props}>
      {icon ? <span className="button__icon">{icon}</span> : null}
      {children ? <span>{children}</span> : null}
    </Link>
  );
}

function buttonClassName(tone: ButtonTone, size: ButtonSize, className: string): string {
  return ['button', `button--${tone}`, `button--${size}`, className].filter(Boolean).join(' ');
}
