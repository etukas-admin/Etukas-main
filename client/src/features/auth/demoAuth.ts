import type { LoginInput } from "@etukas/shared";
import type { User } from "../../services/api";

const demoAccounts: ReadonlyArray<User & { password: string }> = [
  {
    id: "demo-customer",
    name: "Demo Customer",
    email: "customer.demo@etukas.local",
    password: "Etukas@123",
    roles: ["CUSTOMER"]
  },
  {
    id: "demo-seller",
    name: "Sai Traders Owner",
    email: "seller.demo@etukas.local",
    password: "Etukas@123",
    roles: ["SELLER"]
  },
  {
    id: "demo-admin",
    name: "Development Admin",
    email: "admin.demo@etukas.local",
    password: "Etukas@123",
    roles: ["ADMIN"]
  }
];

export const isDemoLoginEnabled = import.meta.env.DEV && import.meta.env.VITE_DEMO_LOGIN === "true";

export function loginDemoAccount(input: LoginInput): User {
  const account = demoAccounts.find(
    ({ email, password }) => email === input.email.toLowerCase() && password === input.password
  );

  if (!account) throw new Error("Invalid email or password");

  const { password: _password, ...user } = account;
  return user;
}
