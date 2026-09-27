"use client";

import { triggerFocus, useInteraction } from "@/lib/interaction";

/**
 * Bottom-centre prompt for the nearest object ("E · 🌱 Plant"). On touch devices it becomes a big
 * action button bottom-right (the joystick owns bottom-left).
 */
export function ActionPrompt({ touch }: { touch: boolean }) {
  const prompt = useInteraction((s) => s.prompt);
  const uiOpen = useInteraction((s) => s.uiOpen);
  if (uiOpen) return null;

  if (touch) {
    return (
      <div className="pointer-events-none absolute bottom-[92px] right-4 z-30 flex flex-col items-end gap-2">
        {prompt && (
          <div className="animate-pop max-w-[60vw] truncate rounded-full border-2 border-white bg-grass-900/80 px-3 py-1 font-display text-sm font-extrabold text-white shadow-chunky-sm">
            {prompt.label}
          </div>
        )}
        <button
          className={`pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white text-4xl shadow-chunky transition active:scale-95 ${
            prompt?.actionable ? "bg-sun-400" : "bg-white/60 opacity-70"
          }`}
          onClick={() => triggerFocus()}
          disabled={!prompt?.actionable}
          aria-label={prompt ? prompt.label : "Nothing nearby"}
        >
          {prompt?.icon ?? "✋"}
        </button>
      </div>
    );
  }

  if (!prompt) return null;
  return (
    <div className="pointer-events-none absolute bottom-8 left-1/2 z-30 -translate-x-1/2">
      <button
        className="pointer-events-auto flex animate-pop items-center gap-2 whitespace-nowrap rounded-2xl border-4 border-white bg-white/95 py-1.5 pl-1.5 pr-4 font-display text-lg font-extrabold text-grass-800 shadow-chunky"
        onClick={() => triggerFocus()}
        disabled={!prompt.actionable}
      >
        <kbd className="flex h-9 w-9 items-center justify-center rounded-xl bg-grass-700 font-display text-base text-white shadow-chunky-sm">E</kbd>
        <span className="text-2xl">{prompt.icon}</span>
        {prompt.label}
      </button>
    </div>
  );
}
