/**
 * THE GREETINGS, IN THE ORDER THEY ARE WRITTEN.
 *
 * English first, because it is the language of the page. Then Nigeria, because
 * that is where the studio is and where most of the people signing in are.
 * Then the rest of Africa, then the world.
 *
 * `method` is how each one is drawn:
 *   pen-en / pen-vi  the hand-drawn paths from the "hello" and "xin chào"
 *                    effect, drawn stroke by stroke;
 *   script-draw      any other Latin-script greeting, written in Caveat;
 *   reveal           non-Latin scripts, in the device's own fonts (no extra
 *                    download), revealed by a wipe in reading direction.
 *
 * ENTRIES THAT NEED A NATIVE SPEAKER ARE NOT HERE. The brief marked Edo
 * ("Kóyo"), Fulfulde ("Jam"), Wolof ("Nanga def") and Shona ("Mhoro") as
 * "verify before launch, drop if unverified". Nobody has verified them, so
 * they are dropped rather than shipped as a guess: a wrong greeting in
 * somebody's own language is worse than no greeting in it. Add them back
 * here once a speaker has checked them.
 *
 * Yoruba is written with the dot below and both tone marks, NFC-normalised so
 * the text in the page is the same code points a Yoruba keyboard produces.
 */

export type GreetingMethod = "pen-en" | "pen-vi" | "script-draw" | "reveal";

export type Greeting = {
  lang: string;
  text: string;
  method: GreetingMethod;
  dir: "ltr" | "rtl";
};

const g = (lang: string, text: string, method: GreetingMethod = "script-draw", dir: "ltr" | "rtl" = "ltr"): Greeting => ({
  lang,
  text: text.normalize("NFC"),
  method,
  dir,
});

export const GREETINGS: Greeting[] = [
  g("English", "Hello", "pen-en"),
  g("Yoruba", "Ẹ káàbọ̀"),
  g("Igbo", "Nnọọ"),
  g("Hausa", "Sannu"),
  g("Nigerian Pidgin", "How far"),
  g("Swahili", "Habari"),
  g("Twi", "Akwaaba"),
  g("Zulu", "Sawubona"),
  g("Xhosa", "Molo"),
  g("Amharic", "ሰላም", "reveal"),
  g("Lingala", "Mbote"),
  g("Kinyarwanda", "Muraho"),
  g("Sesotho", "Dumela"),
  g("Arabic", "مرحبا", "reveal", "rtl"),
  g("Spanish", "Hola"),
  g("French", "Bonjour"),
  g("Portuguese", "Olá"),
  g("German", "Hallo"),
  g("Italian", "Ciao"),
  g("Turkish", "Merhaba"),
  g("Hindi", "नमस्ते", "reveal"),
  g("Mandarin Chinese", "你好", "reveal"),
  g("Japanese", "こんにちは", "reveal"),
  g("Korean", "안녕하세요", "reveal"),
  g("Russian", "Привет", "reveal"),
  g("Greek", "Γειά σου", "reveal"),
  g("Hebrew", "שלום", "reveal", "rtl"),
  g("Vietnamese", "xin chào", "pen-vi"),
  g("Indonesian", "Halo"),
  g("Polish", "Cześć"),
  g("Swedish", "Hej"),
  g("Tagalog", "Kumusta"),
  g("Thai", "สวัสดี", "reveal"),
  g("Hawaiian", "Aloha"),
  g("Irish", "Dia duit"),
  g("Persian", "سلام", "reveal", "rtl"),
];

export const byLang = (lang: string | null | undefined) =>
  GREETINGS.find((entry) => entry.lang === lang) ?? GREETINGS[0]!;
