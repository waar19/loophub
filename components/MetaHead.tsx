import Head from "next/head";

interface MetaHeadProps {
  title: string;
  description?: string;
  imageUrl?: string;
  url?: string;
}

/**
 * Component that injects SEO meta tags into the page head.
 * Uses Next.js <Head> to add standard tags, Open Graph and Twitter Card.
 */
export default function MetaHead({
  title,
  description = "",
  imageUrl = "",
  url = "",
}: MetaHeadProps) {
  const siteName = "Loophub";
  const fullTitle = `${title} | ${siteName}`;
  const ogImage =
    imageUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/og-default.png`;
  const pageUrl =
    url ||
    `${process.env.NEXT_PUBLIC_BASE_URL}${
      typeof window !== "undefined" ? window.location.pathname : ""
    }`;

  return (
    <Head>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
}
