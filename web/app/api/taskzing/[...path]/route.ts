import { NextRequest, NextResponse } from "next/server";
import { getServerBackendBaseUrl } from "@/lib/api/http";

export const dynamic = "force-dynamic";

async function proxy(req: NextRequest, pathSegments: string[] | undefined) {
  const base = getServerBackendBaseUrl();
  const path = pathSegments?.length ? `/${pathSegments.join("/")}` : "";
  const search = req.nextUrl.search || "";
  const url = `${base}${path}${search}`;

  const headers = new Headers();
  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const accept = req.headers.get("accept");
  headers.set("accept", accept || "application/json");

  const method = req.method.toUpperCase();
  let body: ArrayBuffer | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body: body && body.byteLength ? body : undefined,
      cache: "no-store",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream fetch failed";
    return NextResponse.json({ message }, { status: 502 });
  }

  const out = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) out.set("content-type", ct);

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, { status: upstream.status, headers: out });
}

type RouteCtx = { params: { path?: string[] } };

export function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export function HEAD(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}

export function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, ctx.params.path);
}
