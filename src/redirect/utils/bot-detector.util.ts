/**
 * Bot detection utility for identifying  common social media crawlers and search engine bots User-Agent strings
 */
export class BotDetector {
  private static readonly BOT_PATTERNS = [
    // Social media crawlers
    /facebookexternalhit/i,
    /facebot/i,
    /twitterbot/i,
    /twitter/i,
    /x-bot/i,
    /line/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegram/i,
    /slackbot/i,
    /discordbot/i,
    /pinterest/i,

    // Search engine bots
    /googlebot/i,
    /bingbot/i,
    /slurp/i, // Yahoo
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,

    // Generic bot indicators
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
  ];

  static isBot(userAgent: string | undefined): boolean {
    if (!userAgent) {
      return false;
    }

    return this.BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
  }
}
