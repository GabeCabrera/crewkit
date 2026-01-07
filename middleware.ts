import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Role-based route protection
    // SUPERUSER and ADMIN can access admin routes
    if (pathname.startsWith("/admin") && !["SUPERUSER", "ADMIN"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // SUPERUSER, ADMIN, and MANAGER can access manager routes
    if (pathname.startsWith("/manager") && !["SUPERUSER", "ADMIN", "MANAGER"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/field/:path*"],
};

