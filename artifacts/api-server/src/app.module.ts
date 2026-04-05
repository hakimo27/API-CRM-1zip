import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "./database/database.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { UsersModule } from "./users/users.module.js";
import { BranchesModule } from "./branches/branches.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { ProductsModule } from "./products/products.module.js";
import { PricingModule } from "./pricing/pricing.module.js";
import { AvailabilityModule } from "./availability/availability.module.js";
import { OrdersModule } from "./orders/orders.module.js";
import { InventoryModule } from "./inventory/inventory.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { TelegramModule } from "./telegram/telegram.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { ToursModule } from "./tours/tours.module.js";
import { ContentModule } from "./content/content.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { CustomersModule } from "./customers/customers.module.js";
import { SalesModule } from "./sales/sales.module.js";
import { MediaModule } from "./media/media.module.js";
import { TemplatesModule } from "./templates/templates.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    CategoriesModule,
    ProductsModule,
    PricingModule,
    AvailabilityModule,
    OrdersModule,
    InventoryModule,
    ChatModule,
    TelegramModule,
    SettingsModule,
    ToursModule,
    ContentModule,
    NotificationsModule,
    CustomersModule,
    SalesModule,
    MediaModule,
    TemplatesModule,
  ],
})
export class AppModule {}
