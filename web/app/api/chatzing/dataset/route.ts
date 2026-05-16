import { getFullKnowledgeDataset } from "@/lib/chatzing/dataset";

export const dynamic = "force-dynamic";

/** Public TaskZing knowledge dataset for ChatZing API / tooling. */
export async function GET() {
  return Response.json(getFullKnowledgeDataset(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
