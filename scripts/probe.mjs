import { Client } from "eve/client";
const client = new Client({ baseUrl: "http://127.0.0.1:4318" });
if (process.argv[2]) {
  const session = client.sessions.attach(process.argv[2]);
  const snap = await session.snapshot({ signal: AbortSignal.timeout(15000) });
  console.log(JSON.stringify(snap).slice(-12000));
} else {
  const start = Date.now();
  const r = await fetch("http://127.0.0.1:11434/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "lumen-local",
      messages: [{ role: "user", content: "Say hello in five words." }],
      reasoning_effort: "none",
      max_tokens: 50,
      stream: false,
    }),
    signal: AbortSignal.timeout(45000),
  });
  const data = await r.json();
  console.log(
    JSON.stringify({
      ms: Date.now() - start,
      status: r.status,
      message: data.choices?.[0]?.message,
      usage: data.usage,
      error: data.error,
    }),
  );
}
