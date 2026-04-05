import { Controller, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { SeedService } from "./seed.service.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("seed")
export class SeedController {
  constructor(private seedService: SeedService) {}

  /**
   * Run demo data seed.
   * Only works when APP_RUN_DEMO_SEED=true env var is set.
   * Idempotent: skips if data already exists.
   */
  @Post("demo")
  @HttpCode(HttpStatus.OK)
  @Roles("superadmin", "admin")
  async runDemoSeed() {
    if (process.env.APP_RUN_DEMO_SEED !== "true") {
      return {
        message: "Demo seed disabled. Set APP_RUN_DEMO_SEED=true in .env to enable.",
        skipped: true,
      };
    }
    return this.seedService.runDemoSeed();
  }
}
