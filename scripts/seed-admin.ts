import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { allowedUsers } from "../src/lib/db/schema";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle({ client: sql });

  await db
    .insert(allowedUsers)
    .values({ email: "nucup53@gmail.com", isAdmin: true })
    .onConflictDoNothing();

  console.log("Admin seeded: nucup53@gmail.com");
  process.exit(0);
}

seed().catch(console.error);
