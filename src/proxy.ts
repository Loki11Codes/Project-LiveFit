import { withAuth } from "next-auth/middleware";

export const proxy = withAuth({
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  // Protect the dashboard and any sub-routes, but allow auth routes
  matcher: [
    "/((?!api|auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
