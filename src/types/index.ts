/** Basic structure for Lead data before saving */
export interface LeadData {
  email: string;
  websiteUrl: string;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  analysisData?: Record<string, any> | null; // Store full JSON response if needed
}

/** Structure of the Lead record in the database */
export interface Lead extends LeadData {
  id: number;
  continueRequested: boolean;
  submittedAt: Date;
}

/** Scores extracted from PageSpeed API */
export interface Scores {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
}

/** Expected request body for the /analyze endpoint */
export interface PageSpeedAnalysisRequest {
  email: string;
  websiteUrl: string;
}

/** Structure of the Google PageSpeed API JSON response (simplified) */
export interface PageSpeedApiResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score: number };
      accessibility?: { score: number };
      'best-practices'?: { score: number };
      seo?: { score: number };
    };
    requestedUrl?: string;
    finalUrl?: string;
  };
  loadingExperience?: object; // Or more specific type if needed
  analysisUTCTimestamp?: string;
  error?: {
    code: number;
    message: string;
  };
}
