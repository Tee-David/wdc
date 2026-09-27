import { expect, test } from "@playwright/test";
import { mailFrom } from "@/lib/mail-sender";
import { settingDef } from "@/lib/settings/registry";

test("the shipped email sender is We Dig Creativity", () => {
  const held = process.env.SMTP_FROM_NAME;
  delete process.env.SMTP_FROM_NAME;
  try {
    expect(settingDef("mail.fromName")?.shipped()).toBe("We Dig Creativity");
    expect(mailFrom(undefined, "studio@example.com")).toEqual({
      name: "We Dig Creativity",
      address: "studio@example.com",
    });
  } finally {
    if (held === undefined) delete process.env.SMTP_FROM_NAME;
    else process.env.SMTP_FROM_NAME = held;
  }
});
