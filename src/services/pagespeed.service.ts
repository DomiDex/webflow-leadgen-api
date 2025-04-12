import type { Scores, PageSpeedApiResponse } from '../types/index.ts';
import { dotenvConfig } from '../../deps.ts';

const env = dotenvConfig({ export: true });
const API_KEY = env.PAGESPEED_API_KEY;

if (!API_KEY) {
  console.warn(
    'PAGESPEED_API_KEY environment variable is not set! PageSpeed analysis will be skipped.'
  );
  // Decide if you want to exit or allow running without API key (e.g., for testing)
  // Deno.exit(1); // Exiting might be too harsh, let the service handle it.
}

const BASE_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export class PageSpeedService {
  async analyzeUrl(
    url: string,
    strategy: 'DESKTOP' | 'MOBILE' = 'MOBILE'
  ): Promise<{ scores: Scores; analysisData: PageSpeedApiResponse }> {
    if (!API_KEY) {
      console.warn('PAGESPEED_API_KEY not set. Skipping analysis.');
      // Return a structure consistent with the expected Promise resolution type
      return {
        scores: {
          performance: null,
          accessibility: null,
          bestPractices: null,
          seo: null,
        },
        analysisData: { error: { code: 0, message: 'API Key not configured' } },
      };
    }
    if (!url) {
      throw new Error('URL is required for PageSpeed analysis.');
    }

    // Basic URL validation/prep
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl; // Default to https
    }

    try {
      new URL(targetUrl); // Validate if it's a parseable URL
    } catch (_) {
      throw new Error(`Invalid URL format: ${url}`);
    }

    const categories = [
      'PERFORMANCE',
      'ACCESSIBILITY',
      'BEST_PRACTICES',
      'SEO',
    ];
    const params = new URLSearchParams({
      url: targetUrl,
      key: API_KEY, // API_KEY is guaranteed to be defined here due to the check above
      strategy: strategy,
    });
    categories.forEach((cat) => params.append('category', cat));

    const requestUrl = `${BASE_URL}?${params.toString()}`;
    console.log(
      `Requesting PageSpeed analysis for: ${targetUrl} with strategy: ${strategy}`
    );

    try {
      const response = await fetch(requestUrl);

      // Try to get body text regardless of status for better error info
      const responseBodyText = await response.text();

      if (!response.ok) {
        console.error(
          `PageSpeed API error (${response.status}): ${responseBodyText}`
        );
        throw new Error(
          `PageSpeed API request failed with status ${response.status}`
        );
      }

      // Parse the body text now we know it's likely JSON
      const data: PageSpeedApiResponse = JSON.parse(responseBodyText);

      if (data.error) {
        console.error(`PageSpeed API returned an error: ${data.error.message}`);
        throw new Error(`PageSpeed analysis error: ${data.error.message}`);
      }

      if (!data.lighthouseResult?.categories) {
        console.error(
          'PageSpeed response missing lighthouseResult.categories:',
          data
        );
        throw new Error('Invalid PageSpeed API response structure.');
      }

      // Extract scores safely
      const cats = data.lighthouseResult.categories;
      const scores: Scores = {
        performance: cats.performance?.score ?? null,
        accessibility: cats.accessibility?.score ?? null,
        bestPractices: cats['best-practices']?.score ?? null, // Handle hyphenated key
        seo: cats.seo?.score ?? null,
      };

      console.log(`Analysis complete for ${targetUrl}. Scores:`, scores);
      return { scores, analysisData: data }; // Return the full analysis data as well
    } catch (error) {
      console.error(
        `Error calling PageSpeed API or processing response: ${error.message}`
      );
      // Propagate a meaningful error
      throw new Error(`Failed to analyze URL '${targetUrl}': ${error.message}`);
    }
  }
}
