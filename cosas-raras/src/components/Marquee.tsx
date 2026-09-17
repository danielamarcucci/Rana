import { MARQUEE_WORDS } from "@/lib/content";

export default function Marquee() {
  const items = [...MARQUEE_WORDS, ...MARQUEE_WORDS];
  return (
    <div className="relative overflow-hidden border-y border-ink/10 bg-wine py-4">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {[...items, ...items].map((word, i) => (
          <span
            key={i}
            className="font-display text-sm font-bold uppercase tracking-[0.25em] text-cream/90"
          >
            {word}
            <span className="ml-10 text-blush">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
