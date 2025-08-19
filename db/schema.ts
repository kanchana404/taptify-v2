// db/schema.ts
import {
  pgTable,
  serial,
  text,
  timestamp,
  numeric,
  integer,
  date,
  real,
  boolean,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";
import { InferModel } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  org_id: integer("org_id").references(() => teams.id, { onDelete: "set null" }), // Add this line
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type User = InferModel<typeof users>;

export const callHistory = pgTable("call_history", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  aaname: text("aaname").notNull(),
  phone: text("phone").notNull(),
  calltype: text("calltype").notNull(),
  callstatus: text("callstatus").notNull(),
  score: text("score"),
  sms: text("sms"),
  createdtime: timestamp("createdtime", { withTimezone: true })
    .defaultNow()
    .notNull(),
  record_url: text("record_url"),
  duration: numeric("duration", { precision: 5, scale: 2 }),
  ended_reason: text("ended_reason"),
  credit_cost: numeric("credit_cost", { precision: 10, scale: 2 }),
});
export type CallHistory = InferModel<typeof callHistory>;

export const link = pgTable("link", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  call_id: integer("call_id")
    .notNull()
    .references(() => callHistory.id, { onDelete: "cascade" }),
  link_id: text("link_id").notNull().unique(),
  link_status: text("link_status"),
  link_sent: text("link_sent"),
  clicked_time: timestamp("clicked_time", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type Link = InferModel<typeof link>;

export const contact = pgTable("contact", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone_number: text("phone_number").notNull(),
  last_visit_date: date("last_visit_date"),
  callstatus: text("callstatus"),
});
export type Contact = InferModel<typeof contact>;

export const userbase = pgTable("userbase", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  aaname: text("aaname").notNull(),
  phone: text("phone").notNull(),
  lastvisitdate: date("lastvisitdate"),
  callstatus: text("callstatus"),
  callattempts: integer("callattempts"),
  recalldate: text("recalldate"),
  recallstatus: text("recallstatus").default("active"),
});
export type Userbase = InferModel<typeof userbase>;

export const instructions = pgTable("instructions", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  first_message_prompt: text("first_message_prompt"),
  reschedule_first_message_prompt: text("reschedule_first_message_prompt"),
  role_prompt: text("role_prompt"),
  context_prompt: text("context_prompt"),
  task_prompt: text("task_prompt"),
  specifics_prompt: text("specifics_prompt"),
  conversation_flow_prompt: text("conversation_flow_prompt"),
  sample_dialogue_prompt: text("sample_dialogue_prompt"),
  key_points_prompt: text("key_points_prompt"),
  after_call_prompt: text("after_call_prompt"),
  link_prompt: text("link_prompt"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type Instructions = InferModel<typeof instructions>;

export const companyData = pgTable("company_data", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  company_name: text("company_name"),
  agent_name: text("agent_name"),
  contact_number: text("contact_number"),
  contact_email: text("contact_email"),
  company_address: text("company_address"),
  product_or_service: text("product_or_service"),
  link: text("link"),
  credits: real("credits").default(0),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type CompanyData = InferModel<typeof companyData>;

export const extra_details = pgTable("extra_details", {
  userid: text("userid").notNull().primaryKey(),
  knowledge_base: text("knowledge_base"),
  professional_questions: text("professional_questions"),
  profession: text("profession"),
  any_additional_requests: text("any_additional_requests"),
  experience_last_visit: text("experience_last_visit"),
  role: text("role"),
  user_timezone: text("user_timezone"),
});
export type ExtraDetails = InferModel<typeof extra_details>;

export const inbound_instructions = pgTable("inbound_instructions", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  first_message_prompt: text("first_message_prompt"),
  role_prompt: text("role_prompt"),
  context_prompt: text("context_prompt"),
  task_prompt: text("task_prompt"),
  specifics_prompt: text("specifics_prompt"),
  conversation_flow_prompt: text("conversation_flow_prompt"),
  sample_dialogue_prompt: text("sample_dialogue_prompt"),
  key_points_prompt: text("key_points_prompt"),
  after_call_prompt: text("after_call_prompt"),
  link_prompt: text("link_prompt"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type InboundInstructions = InferModel<typeof inbound_instructions>;

export const reviewLinks = pgTable("review_links", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  review_link_url: text("review_link_url").notNull(),
  review_title: text("review_title").notNull(),
  star_filter_enabled: boolean("star_filter_enabled").default(true).notNull(),
  star_threshold: integer("star_threshold").default(3).notNull(),
  show_powered_by: boolean("show_powered_by").default(true).notNull(),
  business_name: text("business_name"),
  header_image_url: text("header_image_url"),
  preview_icon_url: text("preview_icon_url"),
  positive_feedback_text: text("positive_feedback_text"),
  negative_feedback_text: text("negative_feedback_text"),
  google_review_link: text("google_review_link"), // Added new field for Google review link
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type ReviewLink = InferModel<typeof reviewLinks>;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"), // Optional, so no notNull constraint
  stars: integer("stars").notNull(),
  feedback: text("feedback").notNull(),
  review_type: text("review_type").notNull(), // 'positive' or 'negative'
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type Review = InferModel<typeof reviews>;

export const replies = pgTable("replies", {
  id: serial("id").primaryKey(),
  review_id: integer("review_id")
    .notNull()
    .references(() => reviews.id, { onDelete: "cascade" }),
  reply: text("reply").notNull(),
  is_ai_generated: boolean("is_ai_generated").default(false).notNull(),
  reply_type: text("reply_type").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type Reply = InferModel<typeof replies>;

export const qrCodeSettings = pgTable("qr_code_settings", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  qr_instruction_text: text("qr_instruction_text")
    .default("Scan this QR code to access our review form")
    .notNull(),
  voice_id: text("voice_id"), // New column for storing the selected voice ID
  voice_name: text("voice_name"), // New column for storing the voice name for display purposes
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type QrCodeSettings = InferModel<typeof qrCodeSettings>;

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  admin_id: text("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  member_count: integer("member_count").default(0).notNull(),
  clerk_org_id: text("clerk_org_id").notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type Team = InferModel<typeof teams>;

export const admin = pgTable("admin", {
  id: serial("id").primaryKey(),
  admin_id: text("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type Admin = InferModel<typeof admin>;

export const team_configuration = pgTable("team_configuration", {
  id: serial("id").primaryKey(),
  team_id: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  twilio_api_key: boolean("twilio_api_key").default(false).notNull(),
  vapi_key: boolean("vapi_key").default(false).notNull(),
  branding: boolean("branding").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type TeamConfiguration = InferModel<typeof team_configuration>;

export const team_members = pgTable(
  "team_members",
  {
    id: serial("id").primaryKey(),
    team_id: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    teamMembersUnique: unique().on(table.team_id, table.user_id),
  })
);

export type TeamMember = InferModel<typeof team_members>;

export const integrations = pgTable("integrations", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  openai_api_key: text("openai_api_key"),
  vapi_api_key: text("vapi_api_key"),
  twilio_sid: text("twilio_sid"),
  twilio_auth_token: text("twilio_auth_token"),
  stripe_connected_account_id: text("stripe_connected_account_id"),
  stripe_access_token: text("stripe_access_token"),
  stripe_refresh_token: text("stripe_refresh_token"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Integration = InferModel<typeof integrations>;

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  org_id: integer("org_id").notNull(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  product_id: text("product_id"),
  price_id: text("price_id"),
  credits_enabled: boolean("credits_enabled").default(false).notNull(),
  qr_enabled: boolean("qr_enabled").default(false).notNull(),
  incoming_calls_enabled: boolean("incoming_calls_enabled")
    .default(false)
    .notNull(),
  reschedule_enabled: boolean("reschedule_enabled").default(false).notNull(),
  script_change_enabled: boolean("script_change_enabled")
    .default(false)
    .notNull(),
  voice_selection_enabled: boolean("voice_selection_enabled")
    .default(false)
    .notNull(),
  review_protection_enabled: boolean("review_protection_enabled")
    .default(false)
    .notNull(),
  remove_branding_enabled: boolean("remove_branding_enabled")
    .default(false)
    .notNull(),
  custom_twilio_enabled: boolean("custom_twilio_enabled")
    .default(false)
    .notNull(),
  sms_count: integer("sms_count").default(100).notNull(),
  credit_count: integer("credit_count").default(0).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type Package = InferModel<typeof packages>;

export const integration_org = pgTable("integration_org", {
  org_id: text("org_id")
    .primaryKey()
    .references(() => teams.clerk_org_id, { onDelete: "cascade" }),
  openai_api_key: text("openai_api_key"),
  vapi_api_key: text("vapi_api_key"),
  twilio_sid: text("twilio_sid"),
  twilio_auth_token: text("twilio_auth_token"),
  stripe_connected_account_id: text("stripe_connected_account_id"),
  stripe_access_token: text("stripe_access_token"),
  stripe_refresh_token: text("stripe_refresh_token"),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type IntegrationOrg = InferModel<typeof integration_org>;

export const admin_packages = pgTable("admin_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  product_id: text("product_id"),
  price_id: text("price_id"),
  twilio_api_key: boolean("twilio_api_key").default(false).notNull(),
  vapi_key: boolean("vapi_key").default(false).notNull(),
  branding: boolean("branding").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const google_oauth = pgTable("google_oauth", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token").notNull(),
  token_type: text("token_type").default("Bearer"),
  scope: text("scope"),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type GoogleOAuth = InferModel<typeof google_oauth>;

export const scheduledPosts = pgTable("scheduled_posts", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  location_id: text("location_id"), // Add location_id column for multi-business support
  account_name: text("account_name"), // Store account name with ID format like "account/1128"
  summary: text("summary").notNull(),
  topic_type: text("topic_type").notNull(), // STANDARD, EVENT, OFFER, ALERT
  action_type: text("action_type").notNull(),
  action_url: text("action_url"),
  media_url: text("media_url"), // or use a separate media table if needed
  language_code: text("language_code").default("en"),
  scheduled_publish_time: timestamp("scheduled_publish_time", { withTimezone: true }).notNull(),
  status: text("status").default("scheduled").notNull(), // scheduled, published, failed, etc.
  published_at: timestamp("published_at", { withTimezone: true }),
  batch_id: text("batch_id"), // Use a UUID to group posts scheduled in one operation
  metadata: text("metadata"), // JSON field for storing structured data for all post types (events, offers, alerts, products, services, announcements, etc.)
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type ScheduledPost = InferModel<typeof scheduledPosts>;

export const scheduledQna = pgTable("scheduled_qna", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  location_id: text("location_id"), // Add location_id column for multi-business support
  account_name: text("account_name"), // Store account name with ID format like "account/1128"
  question: text("question").notNull(),
  answer: text("answer"),
  scheduled_publish_time: timestamp("scheduled_publish_time", { withTimezone: true }).notNull(),
  status: text("status").default("scheduled").notNull(),
  published_at: timestamp("published_at", { withTimezone: true }),
  batch_id: text("batch_id"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type ScheduledQna = InferModel<typeof scheduledQna>;

export const userOnboarding = pgTable("user_onboarding", {
  user_id: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  profile_completed: boolean("profile_completed").default(false).notNull(),
  voice_selected: boolean("voice_selected").default(false).notNull(),
  google_connected: boolean("google_connected").default(false).notNull(),
  onboarding_completed: boolean("onboarding_completed").default(false).notNull(),
  current_step: text("current_step").default("profile").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export type UserOnboarding = InferModel<typeof userOnboarding>;

// New table to store mappings between primary and secondary Clerk accounts
export const userAccountMappings = pgTable("user_account_mappings", {
  id: serial("id").primaryKey(),
  primary_user_id: text("primary_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  secondary_user_id: text("secondary_user_id").notNull(),
  secondary_clerk_instance: text("secondary_clerk_instance").notNull(), // e.g., "secondary", "backup", etc.
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => ({
  uniqueMapping: unique().on(table.primary_user_id, table.secondary_clerk_instance),
}));

export type UserAccountMapping = InferModel<typeof userAccountMappings>;

// Organization members subscription table
export const orgMembersSubscription = pgTable("org_members_subscription", {
  id: serial("id").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  org_id: integer("org_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  package_id: integer("package_id")
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  stripe_subscription_id: text("stripe_subscription_id").unique(),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_price_id: text("stripe_price_id").notNull(),
  status: text("status").default("active").notNull(), // active, canceled, past_due, unpaid, etc.
  current_period_start: timestamp("current_period_start", { withTimezone: true }),
  current_period_end: timestamp("current_period_end", { withTimezone: true }),
  cancel_at_period_end: boolean("cancel_at_period_end").default(false),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  trial_start: timestamp("trial_start", { withTimezone: true }),
  trial_end: timestamp("trial_end", { withTimezone: true }),
  quantity: integer("quantity").default(1),
  metadata: text("metadata"), // Store additional Stripe metadata as JSON string
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type OrgMembersSubscription = InferModel<typeof orgMembersSubscription>;
