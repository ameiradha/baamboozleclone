import React from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 transform transition-all scale-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 ${variantStyles[confirmVariant]}`}
          >
            <Check className="w-4 h-4" />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
