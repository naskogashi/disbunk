export function Brand({ className = "" }: { className?: string }) {
  return <span className={`brand ${className}`}><img src="/favicon.svg" alt="" aria-hidden="true" className="mr-2 inline-block h-7 w-7 self-center" />disbunk<span className="brand-dot">.</span>org</span>;
}
