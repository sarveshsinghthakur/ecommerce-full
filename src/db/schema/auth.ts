import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["customer", "admin"]);

/**
 * Normalized profile mirror of a Firebase Authentication user.
 * `firebaseUid` is the external identity key; the application never stores
 * passwords or provider credentials here.
 */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    firebaseUid: text("firebase_uid").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    displayName: text("display_name"),
    photoUrl: text("photo_url"),
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("customer"),
    disabled: boolean("disabled").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("users_firebase_uid_key").on(t.firebaseUid),
    uniqueIndex("users_email_key").on(t.email),
  ],
);

export const userAddresses = pgTable(
  "user_addresses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull().default("IN"),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("user_addresses_default_per_user").on(t.userId, t.label)],
);

/**
 * Delegated administrator grants. This table is NOT the bootstrap: access to
 * /admin always requires the account to also be listed in the ADMIN_EMAILS (or
 * ADMIN_UIDS) environment variable, so a compromised database row alone can
 * never grant admin. The table exists so the owner can delegate and revoke
 * auditable staff access without editing deployment configuration.
 */
export const adminRoles = pgTable(
  "admin_roles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grantedByUid: text("granted_by_uid").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("admin_roles_user_key").on(t.userId)],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    source: text("source").notNull().default("website"),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_email_key").on(t.email)],
);

export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    bucket: text("bucket").notNull(),
    subject: text("subject").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    hits: integer("hits").notNull().default(1),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("rate_limit_bucket_subject_window").on(
      t.bucket,
      t.subject,
      t.windowStart,
    ),
  ],
);
