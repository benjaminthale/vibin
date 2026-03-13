'use client';

export function CanvasShimmer() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F5F5F5] gap-4">
      <div className="w-64 h-96 rounded-2xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
      <p className="text-sm text-slate-500">Removing background…</p>
    </div>
  );
}
