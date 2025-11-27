import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Validate URL
    new URL(url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "LoopHub-LinkPreview/1.0",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const getMetaTag = (name: string) =>
      $(`meta[property="${name}"]`).attr("content") ||
      $(`meta[name="${name}"]`).attr("content");

    const title =
      getMetaTag("og:title") ||
      getMetaTag("twitter:title") ||
      $("title").text();

    const description =
      getMetaTag("og:description") ||
      getMetaTag("twitter:description") ||
      getMetaTag("description");

    const image = getMetaTag("og:image") || getMetaTag("twitter:image");

    const siteName = getMetaTag("og:site_name");

    return NextResponse.json({
      title: title || "",
      description: description || "",
      image: image || "",
      url,
      siteName: siteName || new URL(url).hostname,
    });
  } catch (error) {
    console.error("Link preview error:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
