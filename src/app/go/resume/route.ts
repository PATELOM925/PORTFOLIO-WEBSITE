import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

export function GET() {
  return NextResponse.redirect(new URL(siteConfig.resumePath, siteConfig.siteUrl), 302);
}
