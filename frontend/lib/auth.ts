import "server-only";

import { betterAuth } from "better-auth";
import { db } from "@/lib/db/pool";
import { sendPasswordResetEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

export const auth = betterAuth({
  database: db,
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || SITE_URL,
  trustedOrigins: [
    SITE_URL,
    "https://www.wedigcreativity.com.ng",
    "http://localhost:3000",
    "http://localhost:3100",
    "http://localhost:3123",
    "http://localhost:3124",
  ],
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.WDC_ALLOW_ADMIN_SEED !== "1",
    requireEmailVerification: false,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      disableSignUp: true,
    },
  } : {},
  user: {
    additionalFields: {
      /* "client", to match `roleEnum`'s own default in lib/db/schema.ts.
         It said "staff" here and "client" there, which meant a row created
         through better-auth and a row created through the schema disagreed
         about what a new person is allowed to see. The safe default is the
         one with the least access, and it is now the same in both places.
         `input: false` keeps the field off the wire: a role is granted, never
         requested. */
      role: { type: "string", required: false, defaultValue: "client", input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: { cookiePrefix: "wdc" },
});

export type AuthSession = typeof auth.$Infer.Session;
