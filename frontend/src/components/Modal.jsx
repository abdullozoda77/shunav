// A bottom sheet on phones, a centered box on wide screens.
export default function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-surface-container-high rounded-t-2xl sm:rounded-2xl p-5 pb-safe shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-headline-sm">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-surface-bright" aria-label="Пӯшидан">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
