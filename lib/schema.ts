import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index, float } from "drizzle-orm/mysql-core";

// ============================================================
// USERS TABLE - العملاء والسائقون والمشرفون
// ============================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["customer", "driver", "admin"]).notNull().default("customer"),
  avatar: varchar("avatar", { length: 500 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================
// AREAS TABLE - مناطق العمل في المدينة
// ============================================================
export const areas = mysqlTable("areas", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameAr: varchar("nameAr", { length: 100 }),         // الاسم بالعربية
  city: varchar("city", { length: 100 }).default("الجزائر"),
  lat: decimal("lat", { precision: 10, scale: 7 }),   // خط العرض المركزي
  lng: decimal("lng", { precision: 10, scale: 7 }),   // خط الطول المركزي
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Area = typeof areas.$inferSelect;
export type InsertArea = typeof areas.$inferInsert;

// ============================================================
// DRIVERS TABLE - تفاصيل السائقين
// ============================================================
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),            // ربط بجدول users
  areaId: int("areaId"),                              // منطقة العمل

  // بيانات المركبة
  vehicleMake: varchar("vehicleMake", { length: 50 }).notNull(),   // الماركة (Toyota)
  vehicleModel: varchar("vehicleModel", { length: 50 }).notNull(), // الموديل (Corolla)
  vehicleYear: int("vehicleYear"),
  vehicleColor: varchar("vehicleColor", { length: 30 }),
  plateNumber: varchar("plateNumber", { length: 20 }).notNull().unique(),
  vehicleType: mysqlEnum("vehicleType", ["sedan", "suv", "minibus", "motorcycle"]).default("sedan"),

  // حالة السائق
  isOnline: boolean("isOnline").default(false),        // متصل أم لا
  isAvailable: boolean("isAvailable").default(false),  // متاح لاستقبال رحلات
  isVerified: boolean("isVerified").default(false),    // وثائقه مُراجَعة

  // موقع السائق الحالي
  currentLat: decimal("currentLat", { precision: 10, scale: 7 }),
  currentLng: decimal("currentLng", { precision: 10, scale: 7 }),
  lastLocationUpdate: timestamp("lastLocationUpdate"),

  // إحصائيات
  totalTrips: int("totalTrips").default(0),
  averageRating: decimal("averageRating", { precision: 3, scale: 2 }).default("0.00"),
  ratingCount: int("ratingCount").default(0),
  totalEarnings: decimal("totalEarnings", { precision: 10, scale: 2 }).default("0.00"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table: any) => ({
  userIdx: index("driver_user_idx").on(table.userId),
  areaIdx: index("driver_area_idx").on(table.areaId),
  onlineIdx: index("driver_online_idx").on(table.isOnline),
}));

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// ============================================================
// TRIPS TABLE - الرحلات
// ============================================================
export const trips = mysqlTable("trips", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  driverId: int("driverId"),                          // null حتى يُسنَّد سائق

  // نقطة الانطلاق
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }).notNull(),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }).notNull(),
  pickupAddress: text("pickupAddress"),

  // الوجهة
  destLat: decimal("destLat", { precision: 10, scale: 7 }).notNull(),
  destLng: decimal("destLng", { precision: 10, scale: 7 }).notNull(),
  destAddress: text("destAddress"),

  // تفاصيل الرحلة
  distanceKm: decimal("distanceKm", { precision: 6, scale: 2 }),   // المسافة بالكيلومتر
  estimatedMinutes: int("estimatedMinutes"),                         // الوقت التقديري
  price: decimal("price", { precision: 8, scale: 2 }),               // السعر بالدينار
  currency: varchar("currency", { length: 10 }).default("DZD"),

  // حالة الرحلة
  status: mysqlEnum("status", [
    "pending",     // بانتظار سائق
    "accepted",    // قبل السائق
    "arrived",     // السائق وصل
    "in_progress", // الرحلة جارية
    "completed",   // مكتملة
    "cancelled"    // ملغاة
  ]).default("pending"),

  // الدفع - نقداً فقط
  paymentMethod: mysqlEnum("paymentMethod", ["cash"]).default("cash").notNull(),
  isPaid: boolean("isPaid").default(false),

  // التواريخ
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  cancelReason: varchar("cancelReason", { length: 255 }),
}, (table: any) => ({
  customerIdx: index("trip_customer_idx").on(table.customerId),
  driverIdx: index("trip_driver_idx").on(table.driverId),
  statusIdx: index("trip_status_idx").on(table.status),
  requestedAtIdx: index("trip_requested_idx").on(table.requestedAt),
}));

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

// ============================================================
// REVIEWS TABLE - تقييمات العملاء للسائقين
// ============================================================
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull().unique(),       // تقييم واحد لكل رحلة
  customerId: int("customerId").notNull(),
  driverId: int("driverId").notNull(),
  rating: int("rating").notNull(),               // 1-5 نجوم
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table: any) => ({
  driverIdx: index("review_driver_idx").on(table.driverId),
  customerIdx: index("review_customer_idx").on(table.customerId),
}));

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ============================================================
// PAYMENTS TABLE - سجلات الدفع النقدي
// ============================================================
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId").notNull(),
  customerId: int("customerId").notNull(),
  driverId: int("driverId").notNull(),
  amount: decimal("amount", { precision: 8, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("DZD"),
  paymentMethod: mysqlEnum("paymentMethod", ["cash"]).default("cash").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "refunded"]).default("pending"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table: any) => ({
  tripIdx: index("payment_trip_idx").on(table.tripId),
  customerIdx: index("payment_customer_idx").on(table.customerId),
}));

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================================
// MESSAGES TABLE - محادثات العميل والسائق
// ============================================================
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  tripId: int("tripId"),                             // مرتبط برحلة
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  text: text("text").notNull(),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table: any) => ({
  tripIdx: index("msg_trip_idx").on(table.tripId),
  senderIdx: index("msg_sender_idx").on(table.senderId),
  receiverIdx: index("msg_receiver_idx").on(table.receiverId),
}));

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ============================================================
// NOTIFICATIONS TABLE - الإشعارات
// ============================================================
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  type: mysqlEnum("type", [
    "trip_request",   // طلب رحلة جديد
    "trip_accepted",  // قبول الرحلة
    "driver_arrived", // السائق وصل
    "trip_completed", // اكتملت الرحلة
    "trip_cancelled", // رحلة ملغاة
    "new_message",    // رسالة جديدة
    "system"          // إشعار نظام
  ]).notNull(),
  relatedTripId: int("relatedTripId"),             // الرحلة المرتبطة
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table: any) => ({
  userIdx: index("notif_user_idx").on(table.userId),
  typeIdx: index("notif_type_idx").on(table.type),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
