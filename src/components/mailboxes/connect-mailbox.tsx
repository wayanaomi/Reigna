"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ConnectState = "idle" | "connecting" | "pending" | "failed";

function useMailboxConnect(provider: "google" | "microsoft") {
  const router = useRouter();
  const [state, setState] = useState<ConnectState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function connect() {
  setState("connecting");
  setMessage(null);

  // Open the popup immediately while we're still inside the user's
  // button-click event. This avoids browser popup blocking after await.
  const popup = window.open("about:blank", "_blank");

  try {
    const response = await fetch(`/api/mailboxes/connect/${provider}`, {
      method: "POST",
    });

    const data = await response.json();

    console.log("Mailbox OAuth response:", {
    hasAuthorizationUrl: Boolean(data.authorizationUrl),
    hasSessionId: Boolean(data.sessionId),
    authorizationUrlHost: data.authorizationUrl
    ? new URL(data.authorizationUrl).host
    : null,
    });

    if (!response.ok) {
      popup?.close();
      setState("failed");
      setMessage(data.error ?? "Reigna couldn't start the connection.");
      return;
    }

    if (!data.authorizationUrl || !data.sessionId) {
      popup?.close();
      setState("failed");
      setMessage("Reigna received an incomplete mailbox connection response.");
      return;
    }

    if (popup) {
      popup.location.href = data.authorizationUrl;
    } else {
      // Popup was blocked. Fall back to the current tab.
      window.location.href = data.authorizationUrl;
      return;
    }

    setState("pending");

    if (pollRef.current) {
      clearInterval(pollRef.current);
    }

    pollRef.current = setInterval(async () => {
      try {
        const statusResponse = await fetch(
          `/api/mailboxes/oauth/status?sessionId=${encodeURIComponent(data.sessionId)}`
        );

        const status = await statusResponse.json();

        if (status.state === "connected") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }

          setState("idle");
          router.refresh();
        } else if (status.state === "failed") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }

          setState("failed");
          setMessage(status.message ?? "The connection failed.");
        }
      } catch {
        // Keep polling. A temporary network failure should not
        // immediately terminate the OAuth flow.
      }
    }, 3000);
  } catch {
    popup?.close();
    setState("failed");
    setMessage("Reigna couldn't start the connection.");
  }
}

  return { state, message, connect };
}

export function ConnectMailboxButtons({ google, microsoft }: { google: boolean; microsoft: boolean }) {
  const googleConnect = useMailboxConnect("google");
  const microsoftConnect = useMailboxConnect("microsoft");

  if (!google && !microsoft) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {google ? (
          <Button size="sm" variant="secondary" onClick={googleConnect.connect} disabled={googleConnect.state === "connecting" || googleConnect.state === "pending"}>
            {googleConnect.state === "pending"
              ? "Waiting for Google…"
              : googleConnect.state === "connecting"
                ? "Starting…"
                : "Connect Google mailbox"}
          </Button>
        ) : null}
        {microsoft ? (
          <Button size="sm" variant="secondary" onClick={microsoftConnect.connect} disabled={microsoftConnect.state === "connecting" || microsoftConnect.state === "pending"}>
            {microsoftConnect.state === "pending"
              ? "Waiting for Microsoft…"
              : microsoftConnect.state === "connecting"
                ? "Starting…"
                : "Connect Microsoft mailbox"}
          </Button>
        ) : null}
      </div>
      {googleConnect.message ? <p className="text-sm text-status-critical">{googleConnect.message}</p> : null}
      {microsoftConnect.message ? <p className="text-sm text-status-critical">{microsoftConnect.message}</p> : null}
    </div>
  );
}
