import { z } from 'zod';
import { insertUserSchema, insertProductSchema, insertCustomerSchema, users, products, customers, orders, orderItems } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      responses: {
        200: z.object({
          items: z.array(z.custom<typeof products.$inferSelect>()),
          total: z.number(),
          offset: z.number(),
          limit: z.number(),
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id',
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products',
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id',
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id',
      responses: {
        204: z.void(),
      },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers',
      responses: {
        200: z.object({
          items: z.array(z.custom<typeof customers.$inferSelect>()),
          total: z.number(),
          offset: z.number(),
          limit: z.number(),
        }),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers',
      input: insertCustomerSchema,
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/customers/:id',
      input: insertCustomerSchema.partial(),
      responses: {
        200: z.custom<typeof customers.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customers/:id',
      responses: {
        200: z.object({ status: z.string() }),
      },
    },
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders',
      responses: {
        200: z.object({
          items: z.array(z.custom<typeof orders.$inferSelect & { customer: typeof customers.$inferSelect }>()),
          total: z.number(),
          offset: z.number(),
          limit: z.number(),
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/orders/:id',
      responses: {
        200: z.custom<typeof orders.$inferSelect & { 
          customer: typeof customers.$inferSelect,
          items: (typeof orderItems.$inferSelect & { product: typeof products.$inferSelect })[] 
        }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders',
      input: z.object({
        customerId: z.number(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
        })),
        status: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof orders.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/status',
      input: z.object({ status: z.string() }),
      responses: {
        200: z.custom<typeof orders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  analytics: {
    get: {
      method: 'GET' as const,
      path: '/api/analytics',
      responses: {
        200: z.object({
          fiscalYearStart: z.coerce.number().optional(),
          fiscalYearLabel: z.string().optional(),
          fiscalYearFrom: z.string().optional(),
          fiscalYearTo: z.string().optional(),
          totalOrders: z.coerce.number(),
          totalRevenue: z.coerce.number(),
          averageOrderValue: z.coerce.number(),
          statusCounts: z.record(z.coerce.number()).default({}),
          topProducts: z.array(z.object({
            name: z.string().default(''),
            quantity: z.coerce.number(),
          })).default([]),
          orderFunnel: z.record(z.coerce.number()).default({}),
          orderAging: z.record(z.coerce.number()).default({}),
          topCustomers: z.array(z.object({
            id: z.coerce.number(),
            name: z.string().default(''),
            orders: z.coerce.number(),
            revenue: z.coerce.number(),
          })).default([]),
          repeatCustomerRate: z.coerce.number().default(0),
          inventoryHealth: z.object({
            inventoryValue: z.coerce.number().default(0),
            lowStockCount: z.coerce.number().default(0),
            deadStockCount: z.coerce.number().default(0),
            deadStockValue: z.coerce.number().default(0),
          }).default({
            inventoryValue: 0,
            lowStockCount: 0,
            deadStockCount: 0,
            deadStockValue: 0,
          }),
          deliveryPerformance: z.object({
            deliveredRate: z.coerce.number().default(0),
            avgDispatchToDeliveryHours: z.coerce.number().default(0),
          }).default({
            deliveredRate: 0,
            avgDispatchToDeliveryHours: 0,
          }),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
