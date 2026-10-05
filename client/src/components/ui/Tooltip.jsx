export default function Tooltip({ text, children }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 hidden w-max max-w-xs -translate-x-1/2 rounded-md bg-fg px-2 py-1 text-xs text-bg shadow group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}
