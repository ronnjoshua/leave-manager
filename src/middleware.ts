import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check for the NextAuth session cookie
  const sessionCookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except:
    // - auth routes (/api/auth)
    // - login page
    // - static files (_next/static, _next/image)
    // - public assets (icons, images, manifest, favicon)
    "/((?!api/auth|login|_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|icons/|images/|manifest\\.json).*)",
  ],
};
