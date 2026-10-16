import Icon from "./Icon.jsx";

// Shows 0-5 stars. With onChange the stars can be clicked (for writing a review).
export default function Stars({ value, size = 14, onChange }) {
  return (
    <div className="flex text-primary">
      {[1, 2, 3, 4, 5].map((star) => {
        const name = value >= star ? "star" : value >= star - 0.5 ? "star_half" : "star";
        const filled = value >= star - 0.5;
        const icon = <Icon name={name} filled={filled} size={size} className={filled ? "" : "text-outline-variant"} />;
        return onChange ? (
          <button key={star} type="button" onClick={() => onChange(star)} aria-label={`${star}`} className="p-0.5">
            {icon}
          </button>
        ) : (
          <span key={star}>{icon}</span>
        );
      })}
    </div>
  );
}
