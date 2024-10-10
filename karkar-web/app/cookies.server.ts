import { createCookie } from "@remix-run/node";

export const userPrefs = createCookie("user-prefs", {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV !== "development",
});
