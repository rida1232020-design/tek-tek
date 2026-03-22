import { initTRPC } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

interface Context { user: any; }
const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  auth: t.router({
    me: t.procedure.query(({ ctx }) => ctx.user),
    logout: t.procedure.mutation(() => ({ success: true })),
  }),

  areas: t.router({
    list: t.procedure.query(async () => {
      return await db.getAreas();
    }),
  }),

  drivers: t.router({
    getAvailable: t.procedure
      .input(z.object({ areaId: z.number().optional() }))
      .query(async ({ input }) => {
        const drivers = await db.getAvailableDrivers(input.areaId);
        // Map to TRPC expected format
        return drivers.map(d => ({
          driver: d,
          user: { name: d.name, phone: d.phone } // Basic mapping
        }));
      }),

    getMyProfile: t.procedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      return await db.getDriverByUserId(ctx.user.id);
    }),

    updateLocation: t.procedure
      .input(z.object({ lat: z.number(), lng: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) return { success: false };
        const driver = await db.getDriverByUserId(ctx.user.id);
        if (driver) {
          await db.updateDriverLocation(driver.id, input.lat, input.lng);
        }
        return { success: true };
      }),
  }),

  trips: t.router({
    create: t.procedure
      .input(z.object({
        pickupLat: z.number(),
        pickupLng: z.number(),
        pickupAddress: z.string(),
        destLat: z.number(),
        destLng: z.number(),
        destAddress: z.string(),
        price: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) return { success: false };
        const result = await db.createTrip({
          customerId: ctx.user.id,
          ...input
        });
        return { success: !!result };
      }),

    updateStatus: t.procedure
      .input(z.object({
        tripId: z.string(),
        status: z.enum(["accepted", "arrived", "in_progress", "completed", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateTripStatus(input.tripId, input.status);
        return { success: true };
      }),

    getMyTrips: t.procedure
      .input(z.object({ limit: z.number().optional().default(20) }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return [];
        return await db.getCustomerTrips(ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
