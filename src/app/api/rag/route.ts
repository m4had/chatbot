import { NextRequest } from "next/server";
import { ingestDocument, searchDocuments, deleteDocument, listDocuments } from "@/server/ai/rag";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");

  if (query) {
    const results = searchDocuments(query);
    return Response.json({ results });
  }

  const documents = listDocuments();
  return Response.json({ documents });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, content, source, metadata } = body;

  if (!content) return Response.json({ error: "content required" }, { status: 400 });

  const docId = ingestDocument(title || "Untitled", content, source, metadata);
  return Response.json({ document_id: docId });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  deleteDocument(id);
  return Response.json({ deleted: true });
}
