// Google Material Symbols: <Icon name="play_arrow" filled size={20} />
export default function Icon({ name, filled = false, size = 20, className = "" }) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? "icon-filled" : ""} ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
