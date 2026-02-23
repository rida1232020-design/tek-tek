import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import * as schema from "./schema";
import { eq, desc, and } from "drizzle-orm";

interface Context { user: any; }
const t = initTRPC.context<Context>().create();

export const appRouter = t.router({

  // ============================================================
  // AUTH
  // ============================================================
  auth: t.router({
    me: t.procedure.query(({ ctx }) => ctx.user),
    logout: t.procedure.mutation(() => ({ success: true })),
  }),

  // ============================================================
  // AREAS - مناطق العمل
  // ============================================================
  areas: t.router({
    list: t.procedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db
        .select()
        .from(schema.areas)
        .where(eq(schema.areas.isActive, true))
        .orderBy(schema.areas.name);
    }),
  }),

  // ============================================================
  // DRIVERS - السائقون
  // ============================================================
  drivers: t.router({
    getAvailable: t.procedure
      .input(z.object({ areaId: z.number().optional() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions: any[] = [
          eq(schema.drivers.isOnline, true),
          eq(schema.drivers.isAvailable, true),
          eq(schema.drivers.isVerified, true),
        ];
        if (input.areaId) conditions.push(eq(schema.drivers.areaId, input.areaId));

        return await db
          .select({ driver: schema.drivers, user: schema.users })
          .from(schema.drivers)
          .innerJoin(schema.users, eq(schema.drivers.userId, schema.users.id))
          .where(and(...conditions))
          .orderBy(desc(schema.drivers.averageRating));
      }),

    getMyProfile: t.procedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db || !ctx.user) return null;

      const results = await db
        .select()
        .from(schema.drivers)
        .where(eq(schema.drivers.userId, ctx.user.id))
        .limit(1);
      return results[0] || null;
    }),

    register: t.procedure
      .input(z.object({
        vehicleMake: z.string().min(1),
        vehicleModel: z.string().min(1),
        vehicleYear: z.number().optional(),
        vehicleColor: z.string().optional(),
        plateNumber: z.string().min(1),
        vehicleType: z.enum(["sedan", "suv", "minibus", "motorcycle"]).optional(),
        areaId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.user) return { success: false };

        await db.insert(schema.drivers).values({
          userId: ctx.user.id,
          ...input,
          isOnline: false,
          isAvailable: false,
          isVerified: false,
        });
        return { success: true };
      }),

    updateStatus: t.procedure
      .input(z.object({
        isOnline: z.boolean(),
        isAvailable: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.user) return { success: false };

        await db
          .update(schema.drivers)
          .set({ isOnline: input.isOnline, isAvailable: input.isAvailable })
          .where(eq(schema.drivers.userId, ctx.user.id));
        return { success: true };
      }),

    updateLocation: t.procedure
      .input(z.object({ lat: z.number(), lng: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.user) return { success: false };

        const driver = await db
          .select()
          .from(schema.drivers)
          .where(eq(schema.drivers.userId, ctx.user.id))
          .limit(1);

        if (driver[0]) {
          await db
            .update(schema.drivers)
            .set({
              currentLat: input.lat.toString(),
              currentLng: input.lng.toString(),
              lastLocationUpdate: new Date(),
            })
            .where(eq(schema.drivers.id, driver[0].id));
        }
        return { success: true };
      }),
  }),

  // ============================================================
  // TRIPS - الرحلات
  // ============================================================
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
        const db = await getDb();
        if (!db || !ctx.user) return { success: false };

        await db.insert(schema.trips).values({
          customerId: ctx.user.id,
          pickupLat: input.pickupLat.toString(),
          pickupLng: input.pickupLng.toString(),
          pickupAddress: input.pickupAddress,
          destLat: input.destLat.toString(),
          destLng: input.destLng.toString(),
          destAddress: input.destAddress,
          price: input.price?.toString(),
          status: "pending",
        });
        return { success: true };
      }),

    updateStatus: t.procedure
      .input(z.object({
        tripId: z.number(),
        status: z.enum(["accepted", "arrived", "in_progress", "completed", "cancelled"]),
        cancelReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };

        const updateData: any = { status: input.status };
        const now = new Date();
        if (input.status === "accepted") updateData.acceptedAt = now;
        if (input.status === "in_progress") updateData.startedAt = now;
        if (input.status === "completed") { updateData.completedAt = now; updateData.isPaid = true; }
        if (input.status === "cancelled") {
          updateData.cancelledAt = now;
          if (input.cancelReason) updateData.cancelReason = input.cancelReason;
        }

        await db.update(schema.trips).set(updateData).where(eq(schema.trips.id, input.tripId));
        return { success: true };
      }),

    assignDriver: t.procedure
      .input(z.object({ tripId: z.number(), driverId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };

        await db
          .update(schema.trips)
          .set({ driverId: input.driverId, status: "accepted", acceptedAt: new Date() })
          .where(eq(schema.trips.id, input.tripId));
        return { success: true };
      }),

    getMyTrips: t.procedure
      .input(z.object({ limit: z.number().optional().default(20) }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.user) return [];

        return await db
          .select()
          .from(schema.trips)
          .where(eq(schema.trips.customerId, ctx.user.id))
          .orderBy(desc(schema.trips.requestedAt))
          .limit(input.limit);
      }),

    getPendingTrips: t.procedure
      .input(z.object({ limit: z.number().optional().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(schema.trips)
          .where(eq(schema.trips.status, "pending"))
          .orderBy(desc(schema.trips.requestedAt))
          .limit(input.limit);
      }),
  }),

  // ============================================================
  // REVIEWS - التقييمات
  // ============================================================
  reviews: t.router({
    create: t.procedure
      .input(z.object({
        tripId: z.number(),
        driverId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.user) return { success: false };

        await db.insert(schema.reviews).values({
          tripId: input.tripId,
          customerId: ctx.user.id,
          driverId: input.driverId,
          rating: input.rating,
          comment: input.comment,
        });

        // تحديث متوسط التقييم
        const all = await db.select().from(schema.reviews).where(eq(schema.reviews.driverId, input.driverId));
        const avg = all.reduce((s: number, r: any) => s + r.rating, 0) / all.length;
        await db.update(schema.drivers).set({
          averageRating: avg.toFixed(2),
          ratingCount: all.length,
        }).where(eq(schema.drivers.id, input.driverId));

        return { success: true };
      }),

    getDriverReviews: t.procedure
      .input(z.object({ driverId: z.number(), limit: z.number().optional().default(10) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(schema.reviews)
          .where(eq(schema.reviews.driverId, input.driverId))
          .orderBy(desc(schema.reviews.createdAt))
          .limit(input.limit);
      }),
  }),

  // ============================================================
  // MESSAGES - الرسائل
  // ============================================================
  messages: t.router({
    getTripMessages: t.procedure
      .input(z.object({ tripId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return await db
          .select()
          .from(schema.messages)
          .where(eq(schema.messages.tripId, input.tripId))
          .orderBy(schema.messages.createdAt);
      }),

    send: t.procedure
      .input(z.object({
        receiverId: z.number(),
        text: z.string().min(1),
        tripId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.user) return { success: false };

        await db.insert(schema.messages).values({
          senderId: ctx.user.id,
          receiverId: input.receiverId,
          text: input.text,
          tripId: input.tripId,
        });
        return { success: true };
      }),
  }),

  // ============================================================
  // NOTIFICATIONS - الإشعارات
  // ============================================================
  notifications: t.router({
    getMyNotifications: t.procedure
      .input(z.object({ limit: z.number().optional().default(20) }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db || !ctx.user) return [];

        return await db
          .select()
          .from(schema.notifications)
          .where(eq(schema.notifications.userId, ctx.user.id))
          .orderBy(desc(schema.notifications.createdAt))
          .limit(input.limit);
      }),

    markAsRead: t.procedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };

        await db
          .update(schema.notifications)
          .set({ isRead: true })
          .where(eq(schema.notifications.id, input.notificationId));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
