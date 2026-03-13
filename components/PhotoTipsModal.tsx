'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface PhotoTipsModalProps {
  onDismiss: () => void;
}

const TIPS = [
  'Lay clothes flat on a plain white or black surface',
  'Use good, even lighting — avoid harsh shadows',
  'Fill the frame with the clothing item',
  'Avoid patterned or textured backgrounds',
  'For accessories, use a contrasting background (dark item = white surface)',
];

export function PhotoTipsModal({ onDismiss }: PhotoTipsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">Getting the best results</h2>
          <p className="mt-0.5 text-sm text-slate-500">Tips for perfect background removal</p>
        </div>

        <div className="px-6 py-4">
          <ul className="flex flex-col gap-3">
            {TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <button
            onClick={onDismiss}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
