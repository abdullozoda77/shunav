// The faint Persian star pattern behind onboarding and the player.
export default function GirihBackground({ className = "" }) {
  return (
    <svg className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="girih" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M32 0 L64 32 L32 64 L0 32 Z" fill="none" stroke="#fabc3e" strokeWidth="1" />
          <path d="M0 0 L32 32 L0 64 Z" fill="none" stroke="#4fdbc8" strokeWidth="0.8" />
          <path d="M64 0 L32 32 L64 64 Z" fill="none" stroke="#4fdbc8" strokeWidth="0.8" />
          <circle cx="32" cy="32" r="8" fill="none" stroke="#fabc3e" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#girih)" />
    </svg>
  );
}
