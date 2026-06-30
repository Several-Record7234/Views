import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import OBR from "@owlbear-rodeo/sdk";
import "./index.css";
import { changelog, getUnseenEntries } from "./changelog";

const WHATS_NEW_MODAL_ID = "dev.views.whats-new";
const AUTO_CLOSE_S = 5;

const TYPE_STYLES = {
  feat: "bg-green/20 text-green",
  fix: "bg-red/20 text-red",
  change: "bg-yellow/20 text-yellow",
} as const;

const TYPE_LABELS = { feat: "New", fix: "Fix", change: "Change" } as const;

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith("_") && part.endsWith("_")) return <em key={i}>{part.slice(1, -1)}</em>;
        return part;
      })}
    </>
  );
}

function WhatsNew() {
  const [remaining, setRemaining] = useState<number | null>(AUTO_CLOSE_S);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeen = new URLSearchParams(window.location.search).get("lastSeen");
  const entries = getUnseenEntries(changelog, lastSeen);

  const handleClose = useCallback(() => { OBR.modal.close(WHATS_NEW_MODAL_ID); }, []);
  const cancelCountdown = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current); clearInterval(tickRef.current!);
    timerRef.current = null; tickRef.current = null; setRemaining(null);
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(handleClose, AUTO_CLOSE_S * 1000);
    tickRef.current = setInterval(() => setRemaining((r) => (r !== null ? r - 1 : null)), 1000);
    return () => { clearTimeout(timerRef.current!); clearInterval(tickRef.current!); };
  }, [handleClose]);

  return (
    <div className="flex flex-col h-full bg-base text-text p-4 gap-3" onClick={cancelCountdown}>
      <div className="flex items-center gap-2 shrink-0">
        <img src="/icon.svg" alt="" className="w-6 h-6 rounded" />
        <span className="text-sm font-bold text-text">Views</span>
        <span className="text-xs text-subtext ml-auto">What&apos;s New</span>
      </div>
      <div className="border-t border-surface-hover shrink-0" />
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3" onScroll={cancelCountdown}>
        {entries.map((entry) => (
          <div key={entry.version}>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-xs font-semibold text-text">v{entry.version}</span>
              <span className="text-xs text-subtext">{entry.date}</span>
            </div>
            <ul className="space-y-1">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className={`shrink-0 mt-px px-1 rounded text-[10px] font-medium leading-4 ${TYPE_STYLES[change.type]}`}>{TYPE_LABELS[change.type]}</span>
                  <span className="text-xs text-subtext"><InlineText text={change.text} /></span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-surface-hover shrink-0" />
      <button onClick={handleClose} className="w-full px-3 py-1.5 rounded text-xs font-medium bg-accent text-base hover:opacity-90 transition-opacity shrink-0">
        {remaining !== null ? `Got it (${remaining}s)` : "Got it"}
      </button>
    </div>
  );
}

OBR.onReady(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><WhatsNew /></React.StrictMode>);
});
