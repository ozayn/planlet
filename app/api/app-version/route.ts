export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ version: process.env.RAILWAY_DEPLOYMENT_ID ?? process.env.VERCEL_DEPLOYMENT_ID ?? null }, { headers: { "Cache-Control": "no-store" } });
}
