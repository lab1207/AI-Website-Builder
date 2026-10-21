import React from 'react';
import Icon from './Icon';

export type ToastTone = 'success' | 'info' | 'error';

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

const TONE_ICON = {
  success: 'check-circle' as const,
  info: 'info' as const,
  error: 'alert' as const,
};

const TONE_COLOR = {
  success: 'text-success',
  info: 'text-accent',
  error: 'text-danger',
};

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <div
      key={toast.id}
      role="status"
      className="animate-rise fixed bottom-5 left-1/2 z-[90] flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 shadow-[var(--shadow-lg)]"
    >
      <span className={`shrink-0 ${TONE_COLOR[toast.tone]}`}>
        <Icon name={TONE_ICON[toast.tone]} size={15} />
      </span>
      <p className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-ink">
        {toast.message}
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label="Dismiss notification"
      >
        <Icon name="x" size={11} />
      </button>
    </div>
  );
};

export default Toast;
