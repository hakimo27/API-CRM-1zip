import { Controller, Get, Inject, Res } from "@nestjs/common";
import { Response } from "express";
import { eq } from "drizzle-orm";
import { DB_TOKEN } from "../database/database.module.js";
import { Public } from "../common/decorators/public.decorator.js";
import {
  productsTable,
  categoriesTable,
  toursTable,
  articlesTable,
  saleProductsTable,
} from "@workspace/db";
import { ConfigService } from "@nestjs/config";

type DrizzleDb = typeof import("@workspace/db").db;

@Controller()
export class SeoController {
  constructor(
    @Inject(DB_TOKEN) private db: DrizzleDb,
    private config: ConfigService
  ) {}

  private getSiteUrl(): string {
    return (
      this.config.get("APP_URL") ||
      this.config.get("SITE_URL") ||
      "https://kayakrent.ru"
    );
  }

  @Get("robots.txt")
  @Public()
  robots(@Res() res: Response) {
    const siteUrl = this.getSiteUrl();
    const body = [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /crm/",
      "Disallow: /checkout",
      "Disallow: /account",
      "Disallow: /cart",
      "",
      `Sitemap: ${siteUrl}/sitemap.xml`,
    ].join("\n");

    res.type("text/plain").send(body);
  }

  @Get("sitemap.xml")
  @Public()
  async sitemap(@Res() res: Response) {
    const siteUrl = this.getSiteUrl();

    const [products, categories, tours, articles] = await Promise.all([
      this.db
        .select({ slug: productsTable.slug, updatedAt: productsTable.updatedAt, scope: productsTable.domainScope })
        .from(productsTable)
        .where(eq(productsTable.active, true)),
      this.db
        .select({ slug: categoriesTable.slug, updatedAt: categoriesTable.updatedAt })
        .from(categoriesTable)
        .where(eq(categoriesTable.active, true)),
      this.db
        .select({ slug: toursTable.slug, updatedAt: toursTable.updatedAt })
        .from(toursTable)
        .where(eq(toursTable.active, true)),
      this.db
        .select({ slug: articlesTable.slug, updatedAt: articlesTable.updatedAt })
        .from(articlesTable)
        .where(eq(articlesTable.status, "published")),
    ]);

    const fmt = (d: Date | null | undefined) =>
      d ? d.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

    const url = (loc: string, lastmod?: Date | null, changefreq = "weekly", priority = "0.7") =>
      `  <url><loc>${loc}</loc><lastmod>${fmt(lastmod)}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

    const urls: string[] = [
      url(`${siteUrl}/`, null, "daily", "1.0"),
      url(`${siteUrl}/catalog`, null, "daily", "0.9"),
      url(`${siteUrl}/sale`, null, "daily", "0.9"),
      url(`${siteUrl}/tours`, null, "weekly", "0.8"),
      url(`${siteUrl}/about`, null, "monthly", "0.5"),
      url(`${siteUrl}/contacts`, null, "monthly", "0.5"),
    ];

    for (const cat of categories) {
      urls.push(url(`${siteUrl}/catalog/${cat.slug}`, cat.updatedAt, "weekly", "0.8"));
    }

    for (const p of products) {
      const path = p.scope === "sale" ? "sale" : "catalog";
      urls.push(url(`${siteUrl}/${path}/${p.slug}`, p.updatedAt, "weekly", "0.7"));
    }

    for (const t of tours) {
      urls.push(url(`${siteUrl}/tours/${t.slug}`, t.updatedAt, "weekly", "0.7"));
    }

    for (const a of articles) {
      urls.push(url(`${siteUrl}/blog/${a.slug}`, a.updatedAt, "monthly", "0.6"));
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      "</urlset>",
    ].join("\n");

    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=3600")
      .send(xml);
  }

  @Get("feed.xml")
  @Public()
  async feedXml(@Res() res: Response) {
    return this.feedYml(res);
  }

  @Get("feed/yml")
  @Public()
  async feedYml(@Res() res: Response) {
    const siteUrl = this.getSiteUrl();
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const [products, categories] = await Promise.all([
      this.db
        .select()
        .from(saleProductsTable)
        .where(eq(saleProductsTable.active, true)),
      this.db.select().from(categoriesTable),
    ]);

    const esc = (s: string | null | undefined) =>
      (s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const catMap = new Map(categories.map((c) => [c.id, c]));

    const offers = products.map((p) => {
      const cat = catMap.get(p.categoryId ?? 0);
      const imgs: string[] = Array.isArray(p.images) ? (p.images as string[]) : [];
      const price = Number(p.price || 0);
      const available = (p.stockQuantity || 0) > 0 && p.stockStatus !== "out_of_stock";
      const url = `${siteUrl}/sale/${p.slug}`;

      const specs: string[] = [];
      if (p.specifications && Array.isArray(p.specifications)) {
        for (const s of p.specifications as Array<{ label: string; value: string; unit?: string }>) {
          if (s.label && s.value) {
            specs.push(`    <param name="${esc(s.label)}">${esc(String(s.value))}${s.unit ? " " + esc(s.unit) : ""}</param>`);
          }
        }
      }

      const pictureTags = imgs
        .slice(0, 5)
        .map((imgUrl) => {
          const fullUrl = imgUrl.startsWith("http") ? imgUrl : `${siteUrl}${imgUrl}`;
          return `    <picture>${esc(fullUrl)}</picture>`;
        });

      return [
        `  <offer id="${p.id}" available="${available}">`,
        `    <url>${esc(url)}</url>`,
        `    <name>${esc(p.name)}</name>`,
        p.brand ? `    <vendor>${esc(p.brand)}</vendor>` : "",
        p.sku ? `    <vendorCode>${esc(p.sku)}</vendorCode>` : "",
        `    <price>${price}</price>`,
        p.oldPrice ? `    <oldprice>${Number(p.oldPrice)}</oldprice>` : "",
        `    <currencyId>RUR</currencyId>`,
        cat ? `    <categoryId>${cat.id}</categoryId>` : "",
        `    <delivery>true</delivery>`,
        `    <pickup>true</pickup>`,
        ...pictureTags,
        `    <description><![CDATA[${p.shortDescription || p.description || ""}]]></description>`,
        ...specs,
        `  </offer>`,
      ]
        .filter(Boolean)
        .join("\n");
    });

    const catXml = categories
      .map((c) => `  <category id="${c.id}">${esc(c.name)}</category>`)
      .join("\n");

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<!DOCTYPE yml_catalog SYSTEM "shops.dtd">`,
      `<yml_catalog date="${now}">`,
      `<shop>`,
      `  <name>${esc(this.config.get("SHOP_NAME") || "")}</name>`,
      `  <company>${esc(this.config.get("SHOP_NAME") || "")}</company>`,
      `  <url>${siteUrl}</url>`,
      `  <currencies><currency id="RUR" rate="1"/></currencies>`,
      `  <categories>`,
      catXml,
      `  </categories>`,
      `  <offers>`,
      ...offers,
      `  </offers>`,
      `</shop>`,
      `</yml_catalog>`,
    ].join("\n");

    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=1800")
      .send(xml);
  }
}
