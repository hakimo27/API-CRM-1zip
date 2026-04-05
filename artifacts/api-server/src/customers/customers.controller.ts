import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { CustomersService } from "./customers.service.js";
import { Roles } from "../common/decorators/roles.decorator.js";

function splitName(name: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (name || "").trim().split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function toDbData(body: any): any {
  const { firstName, lastName, source, city, ...rest } = body;
  const computedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return {
    ...rest,
    name: computedName || rest.name || rest.phone || rest.email || "Клиент",
  };
}

function toApiData(customer: any): any {
  if (!customer) return customer;
  const { firstName, lastName } = splitName(customer.name);
  return { ...customer, firstName, lastName };
}

@Controller("customers")
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @Roles("admin", "manager")
  async findAll(
    @Query("search") search?: string,
    @Query("channel") channel?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const customers = await this.customersService.findAll({
      search,
      channel,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
    return customers.map(toApiData);
  }

  @Get("stats")
  @Roles("admin", "manager")
  getStats() {
    return this.customersService.getStats();
  }

  @Get(":id")
  @Roles("admin", "manager")
  async findOne(@Param("id", ParseIntPipe) id: number) {
    const customer = await this.customersService.findById(id);
    return toApiData(customer);
  }

  @Post()
  @Roles("admin", "manager")
  async create(@Body() body: any) {
    const data = toDbData(body);
    const customer = await this.customersService.create(data);
    return toApiData(customer);
  }

  @Patch(":id")
  @Roles("admin", "manager")
  async update(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    const data = toDbData(body);
    const customer = await this.customersService.update(id, data);
    return toApiData(customer);
  }

  @Delete(":id")
  @Roles("admin")
  delete(@Param("id", ParseIntPipe) id: number) {
    return this.customersService.delete(id);
  }
}
