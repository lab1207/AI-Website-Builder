import React from 'react';
import Icon from './Icon';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Keep working',
  tone = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
        onClick={onCancel}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-panel-in relative w-full max-w-[420px] rounded-[22px] border border-line bg-surface p-5 shadow-[var(--shadow-lg)]"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-accent-soft text-accent'
            }`}
          >
            <Icon name={tone === 'danger' ? 'alert' : 'sparkles'} size={17} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-[15px] font-semibold tracking-[-0.01em]">
              {title}
            </h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{body}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn btn-md btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`btn btn-md ${tone === 'danger' ? 'btn-primary' : 'btn-primary'}`}
          >
            {confirmLabel}
            <Icon name="arrow-right" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
