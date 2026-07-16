// Lightweight always-200 health endpoint for the Fly http_service check.
// (The "/" route redirects (307), which Fly treats as unhealthy.)
export function GET() {
  return Response.json({ ok: true });
}
