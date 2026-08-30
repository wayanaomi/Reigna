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
    try {
      const response = await fetch(`/api/mailboxes/connect/${provider}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setState("failed");
        setMessage(data.error ?? "Reigna couldn't start the connection.");
        return;
      }

      window.open(data.authorizationUrl, "_blank", "noopener,noreferrer");
      setState("pending");

      pollRef.current = setInterval(async () => {
        const statusResponse = await fetch(`/api/mailboxes/oauth/status?sessionId=${data.sessionId}`);
        const status = await statusResponse.json();
        if (status.state === "connected") {
          if (pollRef.current) clearInterval(pollRef.current);
          setState("idle");
          router.refresh();
        } else if (status.state === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setState("failed");
          setMessage(status.message ?? "The connection failed.");
        }
      }, 3000);
    } catch {
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
