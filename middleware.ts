import { clerkMiddleware } from "@clerk/nextjs/server";

// Attaches Clerk auth to requests; route protection is done per-page/route.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals + static files unless in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
