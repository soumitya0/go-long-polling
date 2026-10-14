import { useEffect, useState } from "react";

export default function App() {
  const [data, setData] = useState("");
  const [status, setStatus] = useState("connecting...");
  const [input, setInput] = useState("");

  // ---- Long polling loop ----
  useEffect(() => {
    // Lets us cancel the hanging request when the component unmounts.
    const controller = new AbortController();
    let lastData = ""; // what we already have (sent to the server)

    async function poll() {
      // Keep asking forever (until the component unmounts).
      while (!controller.signal.aborted) {
        try {
          setStatus("waiting for new data...");

          // This request may "hang" for up to 30s until the data changes.
          const res = await fetch(
            `/getData?lastData=${encodeURIComponent(lastData)}`,
            { signal: controller.signal }
          );
          if (!res.ok) throw new Error(`server error ${res.status}`);
          const json = await res.json();

          // Got an answer -> save it, then the loop asks again immediately.
          lastData = json.data;
          setData(json.data);
        } catch (err) {
          if (controller.signal.aborted) return; // we stopped on purpose

          // Server is down or network error -> wait a bit, then retry.
          setStatus("server not reachable, retrying in 2s...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    poll();

    // Cleanup: stop the loop when the component goes away.
    return () => controller.abort();
  }, []);

  // ---- Send new data to the server ----
  async function handleSubmit(e) {
    e.preventDefault();
    if (input.trim() === "") return; // don't send empty data

    try {
      const res = await fetch("/updateData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: input }),
      });
      if (!res.ok) throw new Error(`server error ${res.status}`);
      setInput("");
    } catch (err) {
      setStatus("could not send update, is the backend running?");
    }
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 500, margin: "40px auto", padding: "0 16px" }}>
      <h1>Long Polling Demo</h1>

      <p>Current data from server:</p>
      <h2 style={{ background: "#eee", padding: 16, borderRadius: 8 }}>{data}</h2>
      <p style={{ color: "gray" }}>{status}</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type new data..."
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Update</button>
      </form>

      <p style={{ color: "gray", fontSize: 14 }}>
        Tip: open this page in two browser tabs. Update in one tab and watch the
        other one change instantly.
      </p>
    </div>
  );
}
