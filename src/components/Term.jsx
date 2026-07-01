import { useState, useId } from 'react';
import './Term.css';

// A definition you can actually reach on every device. A native `title=` alone is
// hover-only — invisible on touch and to keyboard users — so this is a real
// disclosure: TAP on mobile, hover on desktop, focus for keyboard; Escape or blur
// dismisses. The plain-English text lives in the glossary.
export default function Term({ define, children }) {
  const [open, setOpen] = useState(false);
  const popId = useId();
  return (
    <span className="term-wrap">
      <button
        type="button"
        className="term"
        title={define}
        aria-label={`${children}: ${define}`}
        aria-expanded={open}
        aria-describedby={open ? popId : undefined}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      >
        {children}
      </button>
      {open && <span role="tooltip" id={popId} className="term__pop">{define}</span>}
    </span>
  );
}
