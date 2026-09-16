export const users = [
  {
    email: "admin@lavishindia.com",
    username: "admin",
    name: "Admin User",
    password: "admin123", // Will be hashed in seed.ts
    role: "ADMIN" as const,
  },
  {
    // Test/QA account — safe to log in with for manual verification.
    email: "customer@test.com",
    username: "testcustomer",
    name: "Test Customer",
    password: "customer123", // Will be hashed in seed.ts
    role: "CUSTOMER" as const,
  },
  {
    email: "john.doe@example.com",
    username: "johndoe",
    name: "John Doe",
    password: "customer123",
    role: "CUSTOMER" as const,
  },
  {
    email: "jane.smith@example.com",
    username: "janesmith",
    name: "Jane Smith",
    password: "customer123",
    role: "CUSTOMER" as const,
  },
];
