/**
 * Content Service
 *
 * Centralized management of all UI text, labels, display configurations, and static content.
 * This service ensures consistency and provides a single source of truth for all application content.
 */

// =============================================================================
// HELP CONTENT
// =============================================================================

interface HelpContent {
  [concept: string]: {
    title: string;
    content: string;
    category?: 'basics' | 'advanced' | 'planning';
  };
}

const HELP_CONTENT: HelpContent = {
  "net-worth": {
    title: "Net Worth",
    content: "Your net worth is the total value of all your assets minus your debts. This is the primary measure of your overall financial health and wealth accumulation progress.",
    category: "basics"
  },
  "asset-allocation": {
    title: "Asset Allocation",
    content: "Asset allocation refers to how your investments are distributed across different asset classes like stocks, bonds, and real estate. A well-diversified allocation helps balance risk and return potential.",
    category: "basics"
  },
  "monte-carlo": {
    title: "Monte Carlo Simulation",
    content: "Monte Carlo simulation runs thousands of possible scenarios for your financial future, accounting for market volatility and uncertainty. This gives you probabilities rather than single predictions.",
    category: "advanced"
  },
  "glide-path": {
    title: "Glide Path",
    content: "A glide path is a systematic approach to adjusting your asset allocation over time, typically becoming more conservative as you approach retirement.",
    category: "planning"
  },
  "withdrawal-rate": {
    title: "Safe Withdrawal Rate",
    content: "The safe withdrawal rate is the percentage of your portfolio you can withdraw annually in retirement while maintaining a high probability that your money will last 30+ years.",
    category: "planning"
  },
  "roth-conversion": {
    title: "Roth Conversion",
    content: "A Roth conversion involves moving money from a traditional retirement account to a Roth account, paying taxes now to enjoy tax-free withdrawals in retirement.",
    category: "advanced"
  },
  "tax-loss-harvesting": {
    title: "Tax Loss Harvesting",
    content: "Tax loss harvesting involves selling investments at a loss to offset capital gains, reducing your current tax burden while maintaining your investment allocation.",
    category: "advanced"
  },
  "rebalancing": {
    title: "Portfolio Rebalancing",
    content: "Rebalancing involves periodically adjusting your portfolio back to your target asset allocation by selling overweight positions and buying underweight ones.",
    category: "basics"
  }
};

// =============================================================================
// ASSET CLASS CONFIGURATION
// =============================================================================

interface AssetClassConfig {
  labels: { [key: string]: string };
  colors: { [key: string]: string };
  descriptions: { [key: string]: string };
}

const ASSET_CLASS_CONFIG: AssetClassConfig = {
  labels: {
    'us_stocks': 'US Stocks',
    'international_stocks': 'International Stocks',
    'emerging_markets': 'Emerging Markets',
    'bonds': 'Bonds',
    'real_estate': 'Real Estate',
    'commodities': 'Commodities',
    'cash': 'Cash'
  },
  colors: {
    'us_stocks': '#3B82F6',      // Blue
    'international_stocks': '#10B981', // Green
    'emerging_markets': '#F59E0B',     // Amber
    'bonds': '#6366F1',          // Indigo
    'real_estate': '#EF4444',    // Red
    'commodities': '#8B5CF6',    // Purple
    'cash': '#6B7280'            // Gray
  },
  descriptions: {
    'us_stocks': 'Domestic equity investments in US companies',
    'international_stocks': 'Foreign developed market equity investments',
    'emerging_markets': 'Equity investments in developing economies',
    'bonds': 'Fixed-income securities and government bonds',
    'real_estate': 'Real estate investment trusts (REITs)',
    'commodities': 'Physical commodities and commodity funds',
    'cash': 'Cash equivalents and money market funds'
  }
};

// =============================================================================
// GEOGRAPHY CONFIGURATION
// =============================================================================

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' }
];

// =============================================================================
// CONTENT SERVICE CLASS
// =============================================================================

export class ContentService {
  /**
   * Get help content for a specific concept
   */
  getHelpContent(concept: string) {
    return HELP_CONTENT[concept] || null;
  }

  /**
   * Get all help content organized by category
   */
  getAllHelpContent() {
    const categorized = {
      basics: [],
      advanced: [],
      planning: []
    };

    Object.entries(HELP_CONTENT).forEach(([key, content]) => {
      const category = content.category || 'basics';
      categorized[category].push({ key, ...content });
    });

    return categorized;
  }

  /**
   * Get asset class labels
   */
  getAssetClassLabels() {
    return ASSET_CLASS_CONFIG.labels;
  }

  /**
   * Get asset class colors
   */
  getAssetClassColors() {
    return ASSET_CLASS_CONFIG.colors;
  }

  /**
   * Get asset class descriptions
   */
  getAssetClassDescriptions() {
    return ASSET_CLASS_CONFIG.descriptions;
  }

  /**
   * Get complete asset class configuration
   */
  getAssetClassConfig() {
    return ASSET_CLASS_CONFIG;
  }

  /**
   * Get specific asset class details
   */
  getAssetClassDetails(assetClass: string) {
    return {
      label: ASSET_CLASS_CONFIG.labels[assetClass] || assetClass,
      color: ASSET_CLASS_CONFIG.colors[assetClass] || '#6B7280',
      description: ASSET_CLASS_CONFIG.descriptions[assetClass] || ''
    };
  }

  /**
   * Get US states list
   */
  getUSStates() {
    return US_STATES;
  }

  /**
   * Get state name by code
   */
  getStateName(code: string) {
    const state = US_STATES.find(s => s.code === code);
    return state?.name || code;
  }

  /**
   * Search help content
   */
  searchHelpContent(query: string) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    Object.entries(HELP_CONTENT).forEach(([key, content]) => {
      if (
        content.title.toLowerCase().includes(lowerQuery) ||
        content.content.toLowerCase().includes(lowerQuery)
      ) {
        results.push({ key, ...content });
      }
    });

    return results;
  }
}

// Singleton instance
export const contentService = new ContentService();

// Class is already exported above