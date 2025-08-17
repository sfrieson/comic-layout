import { z } from "zod/v4";

export const artboardSchema = z.object({
  name: z.string(),
  width: z.number(),
  height: z.number(),
});

export type Artboard = z.infer<typeof artboardSchema>;

export const pageSchema = z.object({
  name: z.string(),
  artboard: artboardSchema,
});

export type Page = z.infer<typeof pageSchema>;

export const projectSchema = z.object({
  name: z.string(),
  pages: z.array(pageSchema),
});

export type Project = z.infer<typeof projectSchema>;
