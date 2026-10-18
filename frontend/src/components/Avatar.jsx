import Icon from "./Icon.jsx";

// The user's profile photo, or the first letter of the name on soft gold when there is no photo.
// Size and shape come from className (e.g. "w-9 h-9 text-label-lg").
export default function Avatar({ user, className = "" }) {
  const base = `rounded-full overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-primary/30 ${className}`;

  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} className={`${base} object-cover`} />;
  }
  return (
    <span className={`${base} bg-primary/15 text-primary font-serif font-bold`}>
      {user ? user.name[0].toUpperCase() : <Icon name="person" size={18} />}
    </span>
  );
}
