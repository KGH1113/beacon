import { z } from "zod";

import { IdSchema } from "../common/entity";

export const MinecraftServerDtoSchema = z.object({
  id: IdSchema,
  name: z.string(),
  host: z.string(),
  port: z.number().int().positive(),
  online: z.boolean(),
});

export const ListMinecraftServersOutputSchema = z.object({
  servers: z.array(MinecraftServerDtoSchema),
});

export const SendRconCommandInputSchema = z.object({
  serverId: IdSchema,
  command: z.string().min(1),
});

export type MinecraftServerDto = z.infer<typeof MinecraftServerDtoSchema>;
export type ListMinecraftServersOutput = z.infer<
  typeof ListMinecraftServersOutputSchema
>;
export type SendRconCommandInput = z.infer<typeof SendRconCommandInputSchema>;
