# Google sign-in flow — item 21

Design-only prototype. Open `index.html` directly and use the top switcher to inspect all eight states in light or dark mode.

The proposal preserves the existing auth boundary:

- Google never creates an open account; an existing or invited account is required.
- Invitation acceptance verifies Google's normalized, verified email against the invited email before the invitation is spent. A mismatch returns to the still-usable invitation.
- First Google sign-in only asks for the missing account detail: the person's name.
- Linking begins from an authenticated Settings / My account page and requires the same verified email.
- Unlinking is disabled unless another sign-in method remains. Emailed links count because they are always available to verified accounts.
- Unknown, unapproved and unavailable verification states fail closed without revealing whether an account exists.

Rebuild the committed screenshots from the repository root:

```powershell
node handoff/prototypes/google-signin-21/capture.mjs
```

Verify all screens at 320px, 390px and desktop, in both themes:

```powershell
node handoff/prototypes/google-signin-21/verify.mjs
```
