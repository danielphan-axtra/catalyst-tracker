type CandidateLink = {
  href: string;
  text: string;
};

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function scoreLink(link: CandidateLink): number {
  const combined = `${link.text} ${link.href}`.toLowerCase();
  let score = 0;
  if (combined.includes("latest")) score += 50;
  if (combined.includes("investor")) score += 30;
  if (combined.includes("presentation")) score += 30;
  if (combined.includes("results")) score += 10;
  if (combined.includes("deck")) score += 10;
  if (combined.includes(".pdf")) score += 15;

  const yearMatches = combined.match(/20\d{2}/g) ?? [];
  if (yearMatches.length > 0) {
    const newestYear = Math.max(...yearMatches.map((y) => Number(y)));
    score += newestYear - 2000;
  }
  return score;
}

function extractLinksFromHtml(html: string, baseUrl: string): CandidateLink[] {
  const links: CandidateLink[] = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) !== null) {
    const rawHref = match[1]?.trim();
    const text = stripHtml(match[2] ?? "");
    if (!rawHref) continue;
    if (rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) continue;

    try {
      const absoluteHref = new URL(rawHref, baseUrl).toString();
      links.push({ href: absoluteHref, text });
    } catch {
      // Ignore malformed URLs.
    }
  }

  return links;
}

export async function getLatestInvestorPresentationUrl(website: string): Promise<string | null> {
  try {
    const rootResponse = await fetch(website, { next: { revalidate: 60 * 60 * 12 } });
    if (!rootResponse.ok) return null;
    const rootHtml = await rootResponse.text();
    const rootLinks = extractLinksFromHtml(rootHtml, website);

    // Prefer explicit presentation links from the homepage first.
    const homepageCandidates = rootLinks.filter((link) => {
      const combined = `${link.text} ${link.href}`.toLowerCase();
      return combined.includes("presentation") && combined.includes("investor");
    });
    if (homepageCandidates.length > 0) {
      return homepageCandidates.sort((a, b) => scoreLink(b) - scoreLink(a))[0].href;
    }

    // Otherwise follow likely IR pages and find the best matching presentation/PDF link.
    const irPage = rootLinks.find((link) => {
      const combined = `${link.text} ${link.href}`.toLowerCase();
      return (
        combined.includes("investor") ||
        combined.includes("announcements") ||
        combined.includes("presentations") ||
        combined.includes("news")
      );
    });

    if (!irPage) return null;

    const irResponse = await fetch(irPage.href, { next: { revalidate: 60 * 60 * 12 } });
    if (!irResponse.ok) return null;
    const irHtml = await irResponse.text();
    const irLinks = extractLinksFromHtml(irHtml, irPage.href);

    const candidates = irLinks.filter((link) => {
      const combined = `${link.text} ${link.href}`.toLowerCase();
      return combined.includes("presentation") || combined.includes("investor deck") || combined.includes(".pdf");
    });
    if (candidates.length === 0) return null;

    return candidates.sort((a, b) => scoreLink(b) - scoreLink(a))[0].href;
  } catch {
    return null;
  }
}

