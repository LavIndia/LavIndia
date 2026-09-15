export const users = [
  {
    email: "admin@lavishindia.com",
    name: "Admin User",
    password: "admin123", // Will be hashed in seed.ts
    role: "ADMIN" as const,
  },
  {
    email: "customer@test.com",
    name: "Test Customer",
    password: "customer123", // Will be hashed in seed.ts
    role: "CUSTOMER" as const,
  },
  {
    email: "john.doe@example.com",
    name: "John Doe",
    password: "customer123",
    role: "CUSTOMER" as const,
  },
  {
    email: "jane.smith@example.com",
    name: "Jane Smith",
    password: "customer123",
    role: "CUSTOMER" as const,
  },
];
