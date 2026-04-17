import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
    // ── ftfw.fit vanity domain routing ──
    const hostname = request.headers.get("host") || "";
    const isVanityDomain = hostname.includes("ftfw.fit");

    if (isVanityDomain) {
        const pathname = request.nextUrl.pathname;
        const segments = pathname.split("/").filter(Boolean);

        if (segments.length === 0) {
            // ftfw.fit/ root → rewrite to /t (index/landing)
            const url = request.nextUrl.clone();
            url.pathname = "/t";
            return NextResponse.rewrite(url);
        }

        if (segments.length === 1) {
            // ftfw.fit/coach-slug → rewrite to /t/coach-slug
            const url = request.nextUrl.clone();
            url.pathname = `/t/${segments[0]}`;
            return NextResponse.rewrite(url);
        }

        // ftfw.fit/coach-slug/offer-slug → falls through to [coachSlug]/[offerSlug]
        return NextResponse.next();
    }

    // ── Main app auth logic ──
    const { response, user } = await updateSession(request);

    // If user is not logged in and trying to access protected pages, redirect to login
    if (!user && (
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/setup")
    )) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If user is logged in and trying to access auth pages, redirect to dashboard
    if (
        user &&
        (request.nextUrl.pathname.startsWith("/login") ||
            request.nextUrl.pathname.startsWith("/register"))
    ) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
