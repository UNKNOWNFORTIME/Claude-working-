import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { exportJSON, exportMarkdown } from "@/server/services/backup";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const format = req.nextUrl.searchParams.get("format") === "md" ? "md" : "json";
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store" };
  if (format === "md") {
    return new NextResponse(await exportMarkdown(user.id), {
      headers: { ...headers, "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="mindspace-${stamp}.md"` },
    });
  }
  return new NextResponse(JSON.stringify(await exportJSON(user.id), null, 2), {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="mindspace-${stamp}.json"` },
  });
}
