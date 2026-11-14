import {sqliteTable, text, integer, primaryKey, uniqueIndex} from "drizzle-orm/sqlite-core";
export const members = sqliteTable("members", {
  email: text("email").primaryKey(), uid: text("uid").unique(),
  role: text("role").notNull(), department: text("department").notNull().default(""),
  name: text("name").notNull().default("담당자"), active: integer("active").notNull().default(1),
});
export const wallets = sqliteTable("wallets", {
  uid: text("uid").primaryKey(), data: text("data").notNull(), version: integer("version").notNull().default(0),
});
export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(), uid: text("uid").notNull(), hash: text("hash").notNull(),
  day: text("day").notNull(), created: text("created").notNull(),
}, t => [uniqueIndex("question_once").on(t.uid,t.hash)]);
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(), author: text("author").notNull(), hash: text("hash").notNull(),
  category: text("category").notNull(), body: text("body").notNull(), created: text("created").notNull(),
}, t => [uniqueIndex("post_once").on(t.author,t.hash)]);
export const likes = sqliteTable("likes", {
  post: text("post").notNull().references(()=>posts.id), uid: text("uid").notNull(), created: text("created").notNull(),
}, t => [primaryKey({columns:[t.post,t.uid]})]);
export const replies = sqliteTable("replies", {
  id: text("id").primaryKey(), post: text("post").notNull().references(()=>posts.id),
  staff: text("staff").notNull(), department: text("department").notNull(), name: text("name").notNull(),
  body: text("body").notNull(), source: text("source").notNull(), created: text("created").notNull(),
});
export const attendance = sqliteTable("attendance", {
  uid: text("uid").notNull(), day: text("day").notNull(),
  points: integer("points").notNull(), tokens: integer("tokens").notNull(), created: text("created").notNull(),
}, t => [primaryKey({columns:[t.uid,t.day]})]);
export const operations = sqliteTable("operations", {
  uid: text("uid").notNull(), id: text("id").notNull(), kind: text("kind").notNull(),
  result: text("result").notNull(), created: text("created").notNull(),
}, t => [primaryKey({columns:[t.uid,t.id]})]);

// Public visitor workspace. Authenticated company records remain separate.
export const visitor_members = sqliteTable("visitor_members", {
  email: text("email").primaryKey(), uid: text("uid").unique(),
  role: text("role").notNull(), department: text("department").notNull().default(""),
  name: text("name").notNull().default("담당자"), active: integer("active").notNull().default(1),
});
export const visitor_wallets = sqliteTable("visitor_wallets", {
  uid: text("uid").primaryKey(), data: text("data").notNull(), version: integer("version").notNull().default(0),
});
export const visitor_questions = sqliteTable("visitor_questions", {
  id: text("id").primaryKey(), uid: text("uid").notNull(), hash: text("hash").notNull(),
  day: text("day").notNull(), created: text("created").notNull(),
}, t => [uniqueIndex("visitor_question_once").on(t.uid,t.hash)]);
export const visitor_posts = sqliteTable("visitor_posts", {
  id: text("id").primaryKey(), author: text("author").notNull(), hash: text("hash").notNull(),
  category: text("category").notNull(), body: text("body").notNull(), created: text("created").notNull(),
}, t => [uniqueIndex("visitor_post_once").on(t.author,t.hash)]);
export const visitor_likes = sqliteTable("visitor_likes", {
  post: text("post").notNull().references(()=>visitor_posts.id), uid: text("uid").notNull(), created: text("created").notNull(),
}, t => [primaryKey({columns:[t.post,t.uid]})]);
export const visitor_replies = sqliteTable("visitor_replies", {
  id: text("id").primaryKey(), post: text("post").notNull().references(()=>visitor_posts.id),
  staff: text("staff").notNull(), department: text("department").notNull(), name: text("name").notNull(),
  body: text("body").notNull(), source: text("source").notNull(), created: text("created").notNull(),
});
export const visitor_attendance = sqliteTable("visitor_attendance", {
  uid: text("uid").notNull(), day: text("day").notNull(),
  points: integer("points").notNull(), tokens: integer("tokens").notNull(), created: text("created").notNull(),
}, t => [primaryKey({columns:[t.uid,t.day]})]);
export const visitor_operations = sqliteTable("visitor_operations", {
  uid: text("uid").notNull(), id: text("id").notNull(), kind: text("kind").notNull(),
  result: text("result").notNull(), created: text("created").notNull(),
}, t => [primaryKey({columns:[t.uid,t.id]})]);

// Isolated two-account demonstration workspace.
export const demo_members = sqliteTable("demo_members", {
  email: text("email").primaryKey(), uid: text("uid").unique(),
  role: text("role").notNull(), department: text("department").notNull().default(""),
  name: text("name").notNull().default("담당자"), active: integer("active").notNull().default(1),
});
export const demo_wallets = sqliteTable("demo_wallets", {
  uid: text("uid").primaryKey(), data: text("data").notNull(), version: integer("version").notNull().default(0),
});
export const demo_questions = sqliteTable("demo_questions", {
  id: text("id").primaryKey(), uid: text("uid").notNull(), hash: text("hash").notNull(),
  day: text("day").notNull(), created: text("created").notNull(),
}, t => [uniqueIndex("demo_question_once").on(t.uid,t.hash)]);
export const demo_posts = sqliteTable("demo_posts", {
  id: text("id").primaryKey(), author: text("author").notNull(), hash: text("hash").notNull(),
  category: text("category").notNull(), body: text("body").notNull(), created: text("created").notNull(),
}, t => [uniqueIndex("demo_post_once").on(t.author,t.hash)]);
export const demo_likes = sqliteTable("demo_likes", {
  post: text("post").notNull().references(()=>demo_posts.id), uid: text("uid").notNull(), created: text("created").notNull(),
}, t => [primaryKey({columns:[t.post,t.uid]})]);
export const demo_replies = sqliteTable("demo_replies", {
  id: text("id").primaryKey(), post: text("post").notNull().references(()=>demo_posts.id),
  staff: text("staff").notNull(), department: text("department").notNull(), name: text("name").notNull(),
  body: text("body").notNull(), source: text("source").notNull(), created: text("created").notNull(),
});
export const demo_attendance = sqliteTable("demo_attendance", {
  uid: text("uid").notNull(), day: text("day").notNull(),
  points: integer("points").notNull(), tokens: integer("tokens").notNull(), created: text("created").notNull(),
}, t => [primaryKey({columns:[t.uid,t.day]})]);
export const demo_operations = sqliteTable("demo_operations", {
  uid: text("uid").notNull(), id: text("id").notNull(), kind: text("kind").notNull(),
  result: text("result").notNull(), created: text("created").notNull(),
}, t => [primaryKey({columns:[t.uid,t.id]})]);

export const demo_sessions=sqliteTable('demo_sessions',{
 token_hash:text('token_hash').primaryKey(),username:text('username').notNull(),expires:integer('expires').notNull(),credential_version:text('credential_version').notNull(),
});
export const demo_login_limits=sqliteTable('demo_login_limits',{
 ip:text('ip').notNull(),bucket:integer('bucket').notNull(),attempts:integer('attempts').notNull(),
},t=>[primaryKey({columns:[t.ip,t.bucket]})]);
export const demo_deleted_posts=sqliteTable('demo_deleted_posts',{
 post:text('post').primaryKey().references(()=>demo_posts.id),deleted_by:text('deleted_by').notNull(),deleted_at:text('deleted_at').notNull(),
});
