import { z } from "zod";
export const ReserveSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
});
export const ConfirmSchema = z.object({ id: z.string().min(1) });
export type ReserveInput = z.infer<typeof ReserveSchema>;
