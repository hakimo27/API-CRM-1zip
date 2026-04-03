import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import availabilityRouter from "./availability";
import pricingRouter from "./pricing";
import ordersRouter from "./orders";
import chatRouter from "./chat";
import formsRouter from "./forms";
import telegramRouter from "./telegram";
import adminOrdersRouter from "./admin/orders";
import adminInventoryRouter from "./admin/inventory";
import adminCustomersRouter from "./admin/customers";
import adminDashboardRouter from "./admin/dashboard";
import adminChatRouter from "./admin/chat";
import adminProductsRouter from "./admin/products";
import adminReportsRouter from "./admin/reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(availabilityRouter);
router.use(pricingRouter);
router.use(ordersRouter);
router.use(chatRouter);
router.use(formsRouter);
router.use(telegramRouter);
router.use(adminOrdersRouter);
router.use(adminInventoryRouter);
router.use(adminCustomersRouter);
router.use(adminDashboardRouter);
router.use(adminChatRouter);
router.use(adminProductsRouter);
router.use(adminReportsRouter);

export default router;
