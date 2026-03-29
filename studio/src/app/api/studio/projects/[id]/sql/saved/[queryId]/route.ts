import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { ApiResponse } from "@/lib/types";

// ---------------------------------------------------------------------------
// DELETE /api/studio/projects/[id]/sql/saved/[queryId]
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; queryId: string }> },
) {
  try {
    const { id, queryId } = await params;

    const result = await query(
      `DELETE FROM saved_queries WHERE id = $1 AND project_id = $2`,
      [queryId, id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: "Saved query not found" } satisfies ApiResponse,
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete saved query";
    return NextResponse.json(
      { success: false, error: message } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
