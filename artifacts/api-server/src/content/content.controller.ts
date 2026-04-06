import { Controller, Get, Post, Patch, Delete, Put, Body, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ContentService } from "./content.service.js";
import { Public } from "../common/decorators/public.decorator.js";
import { Roles } from "../common/decorators/roles.decorator.js";

@Controller("content")
export class ContentController {
  constructor(private contentService: ContentService) {}

  // ─── Articles ──────────────────────────────────────────────────────────────

  @Public()
  @Get("articles")
  getArticles(@Query("search") search?: string, @Query("page") page?: string) {
    return this.contentService.getArticles({ search, page: page ? parseInt(page) : 1 });
  }

  @Get("articles/admin")
  @Roles("admin", "manager", "editor")
  getArticlesAdmin(@Query("status") status?: string, @Query("search") search?: string) {
    return this.contentService.getArticles({ status, search });
  }

  @Public()
  @Get("articles/:slug")
  getArticle(@Param("slug") slug: string) {
    return this.contentService.getArticleBySlug(slug);
  }

  @Post("articles")
  @Roles("admin", "manager", "editor")
  createArticle(@Body() body: any) {
    return this.contentService.createArticle(body);
  }

  @Patch("articles/:id")
  @Roles("admin", "manager", "editor")
  updateArticle(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.contentService.updateArticle(id, body);
  }

  @Delete("articles/:id")
  @Roles("admin")
  deleteArticle(@Param("id", ParseIntPipe) id: number) {
    return this.contentService.deleteArticle(id);
  }

  // ─── Pages ─────────────────────────────────────────────────────────────────

  @Public()
  @Get("pages")
  getPages() {
    return this.contentService.getPages();
  }

  @Get("pages/admin")
  @Roles("admin", "manager", "editor")
  getPagesAdmin() {
    return this.contentService.getPagesAdmin();
  }

  @Post("pages")
  @Roles("admin", "manager", "editor")
  createPage(@Body() body: any) {
    return this.contentService.createPage(body);
  }

  @Public()
  @Get("pages/:slug")
  getPage(@Param("slug") slug: string) {
    return this.contentService.getPageBySlug(slug);
  }

  @Patch("pages/:id")
  @Roles("admin", "manager", "editor")
  updatePage(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.contentService.updatePage(id, body);
  }

  @Delete("pages/:id")
  @Roles("admin", "manager", "editor")
  deletePage(@Param("id", ParseIntPipe) id: number) {
    return this.contentService.deletePage(id);
  }

  @Put("pages/:slug")
  @Roles("admin", "editor")
  upsertPage(@Param("slug") slug: string, @Body() body: any) {
    return this.contentService.upsertPage(slug, body);
  }

  // ─── FAQs ──────────────────────────────────────────────────────────────────

  @Public()
  @Get("faqs")
  getFaqs(@Query("category") category?: string) {
    return this.contentService.getFaqs(category);
  }

  @Post("faqs")
  @Roles("admin", "manager", "editor")
  createFaq(@Body() body: any) {
    return this.contentService.createFaq(body);
  }

  @Patch("faqs/:id")
  @Roles("admin", "manager", "editor")
  updateFaq(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.contentService.updateFaq(id, body);
  }

  @Delete("faqs/:id")
  @Roles("admin")
  deleteFaq(@Param("id", ParseIntPipe) id: number) {
    return this.contentService.deleteFaq(id);
  }

  // ─── Reviews ───────────────────────────────────────────────────────────────

  @Public()
  @Get("reviews")
  getReviews(@Query("featured") featured?: string) {
    return this.contentService.getReviews({
      onlyApproved: true,
      featured: featured === "true" ? true : undefined,
    });
  }

  @Get("reviews/admin")
  @Roles("admin", "manager")
  getReviewsAdmin() {
    return this.contentService.getReviews({ onlyApproved: false });
  }

  @Public()
  @Post("reviews")
  createReview(@Body() body: any) {
    return this.contentService.createReview(body);
  }

  @Post("reviews/admin")
  @Roles("admin", "manager")
  createReviewAdmin(@Body() body: any) {
    return this.contentService.createReviewAdmin(body);
  }

  @Patch("reviews/:id")
  @Roles("admin", "manager")
  updateReview(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.contentService.updateReview(id, body);
  }

  @Patch("reviews/:id/approve")
  @Roles("admin", "manager")
  approveReview(@Param("id", ParseIntPipe) id: number) {
    return this.contentService.approveReview(id);
  }

  @Delete("reviews/:id")
  @Roles("admin")
  deleteReview(@Param("id", ParseIntPipe) id: number) {
    return this.contentService.deleteReview(id);
  }

  // ─── Rivers ────────────────────────────────────────────────────────────────

  @Public()
  @Get("rivers")
  getRivers() {
    return this.contentService.getRivers();
  }

  @Public()
  @Get("rivers/:slug")
  getRiver(@Param("slug") slug: string) {
    return this.contentService.getRiverBySlug(slug);
  }

  @Post("rivers")
  @Roles("admin", "manager")
  createRiver(@Body() body: any) {
    return this.contentService.createRiver(body);
  }

  @Patch("rivers/:id")
  @Roles("admin", "manager")
  updateRiver(@Param("id", ParseIntPipe) id: number, @Body() body: any) {
    return this.contentService.updateRiver(id, body);
  }
}
