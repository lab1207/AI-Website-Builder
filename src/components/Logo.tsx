import React, { useId } from 'react';

/** The mark: a prism-cut "A" with a spark, on the brand gradient. */
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const gradientId = `logo-gradient-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="AI Website Builder"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF7A3D" />
          <stop offset="0.52" stopColor="#FF3D81" />
          <stop offset="1" stopColor="#7257FF" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${gradientId})`} />
      <path
        d="M14.5 34 24 13.5 33.5 34"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 27.5h10" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="36" cy="12" r="3.2" fill="#fff" />
    </svg>
  );
};

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  size = 30,
  showWordmark = true,
  wordmarkClassName = '',
  className = '',
}) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <LogoMark size={size} />
    {showWordmark && (
      <span className={`text-[14px] font-semibold tracking-[-0.02em] text-ink ${wordmarkClassName}`}>
        AI Website Builder
      </span>
    )}
  </span>
);

export default Logo;
