import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/signin",
  },
});

export const config = {
  matcher: [
    "/((?!signin|register|login|subscribe|api/auth|_next|favicon.ico|.*\\..*|^$|^companies|^about|^contact|^careers|^terms|^privacy|^pricing).*)",
  ],
};
