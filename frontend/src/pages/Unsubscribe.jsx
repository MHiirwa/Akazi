import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { api } from "../api/client";

// Landing page for the "Unsubscribe" link in job-alert emails. Reads the token
// from the URL and deactivates the subscription.
export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState("working"); // "working" | "done" | "error"

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    api.jobAlerts
      .unsubscribe(token)
      .then(() => { if (!cancelled) setStatus("done"); })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="page">
      <SiteHeader />
      <main className="jobd-page">
        <div className="jobs-empty" style={{ maxWidth: 520, margin: "40px auto" }}>
          {status === "working" && <p className="dash-muted">Unsubscribing…</p>}
          {status === "done" && (
            <>
              <h1 style={{ marginTop: 0 }}>You're unsubscribed</h1>
              <p>You won't receive any more Akazi job alerts at this address.</p>
              <div style={{ marginTop: 16 }}>
                <Link to="/jobs" className="lp-btn lp-btn--dark">Browse jobs</Link>
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <h1 style={{ marginTop: 0 }}>Link not valid</h1>
              <p>This unsubscribe link is missing or invalid. If you keep getting alerts, try the link in the most recent email.</p>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
