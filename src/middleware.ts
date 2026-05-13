export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect everything except auth routes, login page, static files, and API auth
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
