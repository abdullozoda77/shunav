export default function ProgressRing({ value, color = "text-primary" }) {
  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-container-highest" />
        <circle
          cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${value}, 100`} className={color}
        />
      </svg>
      <span className="absolute text-[9px] font-bold">{value}%</span>
    </div>
  );
}
