import { Global, Module } from "@nestjs/common";
import { db, pool } from "@workspace/db";

export const DB_TOKEN = "DRIZZLE_DB";

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      useValue: db,
    },
    {
      provide: "PG_POOL",
      useValue: pool,
    },
  ],
  exports: [DB_TOKEN, "PG_POOL"],
})
export class DatabaseModule {}
