import { z } from "zod";

export const studentNameSchema = z
  .string()
  .trim()
  .min(2, "Please tell us your name (at least 2 characters).")
  .max(40, "That name is a little long — 40 characters max.")
  .regex(
    /^[\p{L}\p{M}'’\-\s]+$/u,
    "Names can only contain letters, spaces, hyphens and apostrophes."
  );

export type StudentNameInput = z.infer<typeof studentNameSchema>;
