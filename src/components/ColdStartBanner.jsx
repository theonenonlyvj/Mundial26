import { useEffect, useState } from 'react';
import './ColdStartBanner.css';
import { isWaking, subscribe } from '../api/coldStart.js';

// Shows only when the free-tier API server is cold-starting (a request has been
// pending past the threshold). Auto-hides the moment data arrives. Warm visitors
// never see it.
export default function ColdStartBanner() {
  const [waking, setWaking] = useState(isWaking());
  useEffect(() => subscribe(setWaking), []);
  if (!waking) return null;
  return (
    <div className="coldstart" role="status" aria-live="polite">
      <span className="coldstart__emoji" aria-hidden="true">💸</span>
      <span className="coldstart__text">
        VJ went with the free server, so it naps when nobody's watching — showing
        the last scores I saved while it wakes up (~30s). Worth the wait, promise.
      </span>
    </div>
  );
}
