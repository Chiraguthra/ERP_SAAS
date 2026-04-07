import { pgTable, text, serial, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("staff"), // 'admin' | 'staff'
  name: text("name").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").notNull().unique(),
  price: numeric("price").notNull(),
  stock: numeric("stock").notNull().default("0"), // DOUBLE PRECISION / decimal in app
  unit: text("unit"), // e.g. pcs, kg, box
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name"),
  company: text("company"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  pinCode: integer("pin_code"),
  country: text("country"),
  createdOn: timestamp("created_on").defaultNow(),
  website: text("website"),
  phone: text("phone"),
  emailId: text("email_id"),
  contactPerson: text("contact_person"),
  isLead: text("is_lead"),
  leadStatus: text("lead_status"),
  leadSource: text("lead_source"),
  assignedTo: text("assigned_to"),
  clientMigrationDate: timestamp("client_migration_date"),
  gstin: text("gstin"),
  status: text("status"),
  username: text("username"),
  leadCloseCode: integer("lead_close_code"),
  createdBy: text("created_by"),
  location: text("location"),
  leadClosedAt: timestamp("lead_closed_at"),
  leadId: text("lead_id"),
  pan: text("pan"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  billId: text("bill_id"),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  status: text("status").notNull().default("draft"),
  totalAmount: numeric("total_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  freightCharges: numeric("freight_charges"),
  adjustments: numeric("adjustments"),
  cgstPercent: numeric("cgst_percent"),
  sgstPercent: numeric("sgst_percent"),
  igstPercent: numeric("igst_percent"),
  deliveryNote: text("delivery_note"),
  referenceNo: text("reference_no"),
  buyersOrderNo: text("buyers_order_no"),
  dispatchDocNo: text("dispatch_doc_no"),
  dispatchedThrough: text("dispatched_through"),
  modeTermsOfPayment: text("mode_terms_of_payment"),
  otherReferences: text("other_references"),
  deliveryNoteDate: timestamp("delivery_note_date"),
  destination: text("destination"),
  termsOfDelivery: text("terms_of_delivery"),
  contactNumber: text("contact_number"),
  assignedTo: text("assigned_to"),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price").notNull(), // Price at time of order
});

// Relations
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

// Complex types for API
export type OrderWithDetails = Order & {
  customer: Customer;
  items: (OrderItem & { product: Product })[];
};

export type CreateOrderRequest = {
  customerId: number;
  items: { productId: number; quantity: number; price?: number }[];
  status?: string;
  billId?: string | null;
  freightCharges?: number;
  adjustments?: number;
  cgstPercent?: number;
  sgstPercent?: number;
  igstPercent?: number;
  deliveryNote?: string | null;
  referenceNo?: string | null;
  buyersOrderNo?: string | null;
  dispatchDocNo?: string | null;
  dispatchedThrough?: string | null;
  modeTermsOfPayment?: string | null;
  otherReferences?: string | null;
  deliveryNoteDate?: string | null;
  destination?: string | null;
  termsOfDelivery?: string | null;
  contactNumber?: string | null;
  assignedTo?: string | null;
};
