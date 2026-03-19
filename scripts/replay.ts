const args = process.argv.slice(2);
const replayUrl = process.env.REPLAY_URL ?? "http://127.0.0.1:8787/replay";

const dryRun = args.includes("--dry-run");
const fromTimestampArg = args.find((arg) => arg.startsWith("--fromTimestamp="));
const fromTimestamp = fromTimestampArg ? fromTimestampArg.split("=", 2)[1] : undefined;

const response = await fetch(replayUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    dryRun,
    fromTimestamp,
  }),
});

if (!response.ok) {
  console.error(await response.text());
  process.exit(1);
}

const json = (await response.json()) as unknown;
console.log(JSON.stringify(json, null, 2));
