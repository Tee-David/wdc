# Settings

Settings are where infrequent controls live. Every settings page behaves the same way.

- Layout: a section nav (sticky on desktop, a sideways strip on phones) and cards of rows. Each row has the label and one line of explanation on the left, the control on the right; on phones they stack.
- Hints sit under their input, never in a tooltip.
- Changes collect in the shared **SaveBar** that rises at the bottom: "3 changes not saved", Discard and Save. Saving raises a toast: "Updated" for a live setting, "Saved" for something new.
- A control that cannot be used is solid and flat (`ad-tone-flat`), with the reason and the fix beside it: "Only Admin can change payout banks. Ask Babatope."
- The page's one action sits in the head's right slot; chores (export, reset, view history) go in its ⋮ menu.
- Anything we send to a person can be switched off by that person, in their own Notifications settings: email, push and in-app, per kind.
- Destructive changes confirm in a sheet; irreversible ones add "I understand". Deleting is two steps: Move to Trash, then Delete permanently from the Trash (owner only).
- A schema change ships as a migration that the owner applies from Settings, System.

## Owner settings

General (studio details, brand, documents), Team and permissions, Money (currencies and banks, payment providers, VAT, numbering), Notifications, Integrations, Trash, System.

## Staff settings

Profile, Notifications, Appearance.

## Client settings

Profile, People at your business, Notifications, Appearance.
