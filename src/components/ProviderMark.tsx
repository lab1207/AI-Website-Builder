import React from 'react';
import type { ProviderId } from '../lib/providers';

const MARKS: Record<ProviderId, { text: string; tint: string; ink: string }> = {
  gemini: { text: 'G', tint: '#4285f41f', ink: '#4285f4' },
  openai: { text: 'O', tint: '#10a37f1f', ink: '#10a37f' },
  openrouter: { text: 'R', tint: '#6b5bff1f', ink: '#6b5bff' },
  nvidia: { text: 'N', tint: '#76b9001f', ink: '#5d9100' },
  anthropic: { text: 'A', tint: '#d977571f', ink: '#c2603f' },
  custom: { text: '∞', tint: '#8b857c1f', ink: '#6f6960' },
};

/** A compact provider tile. The tint carries the identity; the letter keeps it legible. */
const ProviderMark: React.FC<{ provider: ProviderId; size?: number; className?: string }> = ({
  provider,
  size = 22,
  className = '',
}) => {
  const mark = MARKS[provider] ?? MARKS.custom;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[7px] font-semibold ${className}`}
      style={{
        width: size,
        height: size,
        background: mark.tint,
        color: mark.ink,
        fontSize: Math.round(size * 0.52),
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      {mark.text}
    </span>
  );
};

export default ProviderMark;
