"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, magicLinkClient } from "better-auth/client/plugins";

/* The two client plugins add `signIn.magicLink` and `signIn.emailOtp`, the
   halves of the sign-in email configured in lib/auth.ts. */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), emailOTPClient()],
});
