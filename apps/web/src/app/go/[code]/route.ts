import { NextRequest, NextResponse } from "next/server";

/**
 * GET /go/:code — Short link redirect
 * Calls the API to resolve the short code, which increments the click count,
 * then redirects to the target URL.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    const { code } = params;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
        const res = await fetch(`${apiUrl}/go/${code}`);
        const data = await res.json();

        if (!res.ok || !data.targetUrl) {
            return NextResponse.redirect(new URL("/", request.url));
        }

        // Defense-in-depth: only redirect to http(s) URLs
        try {
            const parsed = new URL(data.targetUrl);
            if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
                return NextResponse.redirect(new URL("/", request.url));
            }
        } catch {
            return NextResponse.redirect(new URL("/", request.url));
        }

        return NextResponse.redirect(data.targetUrl);
    } catch {
        return NextResponse.redirect(new URL("/", request.url));
    }
}
