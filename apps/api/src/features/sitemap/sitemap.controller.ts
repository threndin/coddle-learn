import type { Request, Response } from "express";
import { getSitemapData } from "./sitemap.service.js";

export async function getSitemapHandler(_req: Request, res: Response) {
  const data = await getSitemapData();
  res.json({ data });
}

