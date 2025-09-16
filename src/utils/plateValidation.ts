import { createError } from '../middleware/errorHandler';
import { logger } from './logger';

// Nigerian plate number formats
export interface PlateNumberFormat {
  pattern: RegExp;
  description: string;
  example: string;
  category: 'private' | 'commercial' | 'government' | 'diplomatic' | 'military';
}

// Nigerian plate number patterns
export const NIGERIAN_PLATE_FORMATS: PlateNumberFormat[] = [
  // Current format (2011 - present): ABC-123-DE
  {
    pattern: /^[A-Z]{3}-[0-9]{3}-[A-Z]{2}$/,
    description: 'Current Nigerian format (3 letters, 3 numbers, 2 letters)',
    example: 'ABC-123-DE',
    category: 'private'
  },
  
  // Old format (before 2011): ABC-123-D or AB-123-CD
  {
    pattern: /^[A-Z]{2,3}-[0-9]{3}-[A-Z]{1,2}$/,
    description: 'Old Nigerian format (2-3 letters, 3 numbers, 1-2 letters)',
    example: 'AB-123-CD',
    category: 'private'
  },

  // Commercial vehicles: ABC-123-XY (usually ends with specific letters)
  {
    pattern: /^[A-Z]{3}-[0-9]{3}-[A-Z]{2}$/,
    description: 'Commercial vehicle format',
    example: 'COM-123-XY',
    category: 'commercial'
  },

  // Government vehicles: ABUJA-123 or similar
  {
    pattern: /^[A-Z]{3,6}-[0-9]{3}$/,
    description: 'Government vehicle format',
    example: 'ABUJA-123',
    category: 'government'
  },

  // Diplomatic plates: CD-123-A
  {
    pattern: /^CD-[0-9]{3}-[A-Z]$/,
    description: 'Diplomatic vehicle format',
    example: 'CD-123-A',
    category: 'diplomatic'
  },

  // Military plates: MIL-123 or similar
  {
    pattern: /^MIL-[0-9]{3}$/,
    description: 'Military vehicle format',
    example: 'MIL-123',
    category: 'military'
  },

  // Special plates without hyphens (older vehicles)
  {
    pattern: /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/,
    description: 'Old format without hyphens',
    example: 'AB123CD',
    category: 'private'
  }
];

// Nigerian state codes (for plate validation)
export const NIGERIAN_STATE_CODES = [
  'AA', 'AB', 'AD', 'AE', 'AH', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AY', 'AZ', // Abia variations
  'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ', 'BR', 'BS', 'BT', // Bauchi, Bayelsa, Benue, Borno variations  
  'CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG', 'CH', 'CI', 'CJ', 'CK', 'CL', 'CM', 'CN', 'CO', 'CP', 'CQ', 'CR', 'CS', 'CT', // Cross River variations
  'DA', 'DB', 'DC', 'DD', 'DE', 'DF', 'DG', 'DH', 'DI', 'DJ', 'DK', 'DL', 'DM', 'DN', 'DO', 'DP', 'DQ', 'DR', 'DS', 'DT', // Delta variations
  'EA', 'EB', 'EC', 'ED', 'EE', 'EF', 'EG', 'EH', 'EI', 'EJ', 'EK', 'EL', 'EM', 'EN', 'EO', 'EP', 'EQ', 'ER', 'ES', 'ET', // Ebonyi, Edo, Ekiti, Enugu variations
  'FA', 'FB', 'FC', 'FD', 'FE', 'FF', 'FG', 'FH', 'FI', 'FJ', 'FK', 'FL', 'FM', 'FN', 'FO', 'FP', 'FQ', 'FR', 'FS', 'FT', // FCT variations
  'GA', 'GB', 'GC', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GJ', 'GK', 'GL', 'GM', 'GN', 'GO', 'GP', 'GQ', 'GR', 'GS', 'GT', // Gombe variations
  'HA', 'HB', 'HC', 'HD', 'HE', 'HF', 'HG', 'HH', 'HI', 'HJ', 'HK', 'HL', 'HM', 'HN', 'HO', 'HP', 'HQ', 'HR', 'HS', 'HT', // Various states
  'JA', 'JB', 'JC', 'JD', 'JE', 'JF', 'JG', 'JH', 'JI', 'JJ', 'JK', 'JL', 'JM', 'JN', 'JO', 'JP', 'JQ', 'JR', 'JS', 'JT', // Jigawa variations
  'KA', 'KB', 'KC', 'KD', 'KE', 'KF', 'KG', 'KH', 'KI', 'KJ', 'KK', 'KL', 'KM', 'KN', 'KO', 'KP', 'KQ', 'KR', 'KS', 'KT', // Kaduna, Kano, Katsina, etc.
  'LA', 'LB', 'LC', 'LD', 'LE', 'LF', 'LG', 'LH', 'LI', 'LJ', 'LK', 'LL', 'LM', 'LN', 'LO', 'LP', 'LQ', 'LR', 'LS', 'LT', // Lagos variations
  'MA', 'MB', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MI', 'MJ', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', // Various states
  'NA', 'NB', 'NC', 'ND', 'NE', 'NF', 'NG', 'NH', 'NI', 'NJ', 'NK', 'NL', 'NM', 'NN', 'NO', 'NP', 'NQ', 'NR', 'NS', 'NT', // Nasarawa, Niger variations
  'OA', 'OB', 'OC', 'OD', 'OE', 'OF', 'OG', 'OH', 'OI', 'OJ', 'OK', 'OL', 'OM', 'ON', 'OO', 'OP', 'OQ', 'OR', 'OS', 'OT', // Ogun, Ondo, Osun, Oyo variations
  'PA', 'PB', 'PC', 'PD', 'PE', 'PF', 'PG', 'PH', 'PI', 'PJ', 'PK', 'PL', 'PM', 'PN', 'PO', 'PP', 'PQ', 'PR', 'PS', 'PT', // Plateau variations
  'RA', 'RB', 'RC', 'RD', 'RE', 'RF', 'RG', 'RH', 'RI', 'RJ', 'RK', 'RL', 'RM', 'RN', 'RO', 'RP', 'RQ', 'RR', 'RS', 'RT', // Rivers variations
  'SA', 'SB', 'SC', 'SD', 'SE', 'SF', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SP', 'SQ', 'SR', 'SS', 'ST', // Sokoto variations
  'TA', 'TB', 'TC', 'TD', 'TE', 'TF', 'TG', 'TH', 'TI', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TP', 'TQ', 'TR', 'TS', 'TT', // Taraba variations
  'YA', 'YB', 'YC', 'YD', 'YE', 'YF', 'YG', 'YH', 'YI', 'YJ', 'YK', 'YL', 'YM', 'YN', 'YO', 'YP', 'YQ', 'YR', 'YS', 'YT', // Yobe variations
  'ZA', 'ZB', 'ZC', 'ZD', 'ZE', 'ZF', 'ZG', 'ZH', 'ZI', 'ZJ', 'ZK', 'ZL', 'ZM', 'ZN', 'ZO', 'ZP', 'ZQ', 'ZR', 'ZS', 'ZT'  // Zamfara variations
];

export class PlateValidator {
  // Normalize plate number (remove spaces, convert to uppercase, add hyphens if missing)
  static normalizePlateNumber(plateNumber: string): string {
    if (!plateNumber) return '';

    // Remove all spaces and convert to uppercase
    let normalized = plateNumber.replace(/\s+/g, '').toUpperCase();

    // Add hyphens for old format without hyphens (AB123CD -> AB-123-CD)
    if (/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(normalized)) {
      normalized = `${normalized.slice(0, 2)}-${normalized.slice(2, 5)}-${normalized.slice(5)}`;
    }

    // Add hyphens for 3-letter prefix format (ABC123DE -> ABC-123-DE)
    if (/^[A-Z]{3}[0-9]{3}[A-Z]{2}$/.test(normalized)) {
      normalized = `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
    }

    return normalized;
  }

  // Validate Nigerian plate number format
  static validatePlateNumber(plateNumber: string): {
    isValid: boolean;
    format?: PlateNumberFormat;
    normalized: string;
    errors: string[];
  } {
    const errors: string[] = [];
    const normalized = this.normalizePlateNumber(plateNumber);

    if (!normalized) {
      errors.push('Plate number is required');
      return { isValid: false, normalized, errors };
    }

    // Check against all Nigerian formats
    for (const format of NIGERIAN_PLATE_FORMATS) {
      if (format.pattern.test(normalized)) {
        // Additional validation for state codes (if applicable)
        const stateCode = this.extractStateCode(normalized);
        if (stateCode && !this.isValidStateCode(stateCode)) {
          errors.push(`Invalid state code: ${stateCode}`);
          continue;
        }

        return {
          isValid: true,
          format,
          normalized,
          errors: []
        };
      }
    }

    errors.push('Invalid Nigerian plate number format');
    errors.push(`Expected formats: ${NIGERIAN_PLATE_FORMATS.map(f => f.example).join(', ')}`);

    return {
      isValid: false,
      normalized,
      errors
    };
  }

  // Extract state code from plate number
  private static extractStateCode(plateNumber: string): string | null {
    // For current format ABC-123-DE, the first 2 letters might represent state
    const match = plateNumber.match(/^([A-Z]{2})/);
    return match ? match[1] : null;
  }

  // Check if state code is valid
  private static isValidStateCode(stateCode: string): boolean {
    return NIGERIAN_STATE_CODES.includes(stateCode);
  }

  // Fuzzy matching for damaged/unclear plate numbers
  static fuzzyMatchPlate(inputPlate: string, targetPlate: string, threshold: number = 0.7): {
    isMatch: boolean;
    similarity: number;
    suggestions: string[];
  } {
    const normalizedInput = this.normalizePlateNumber(inputPlate);
    const normalizedTarget = this.normalizePlateNumber(targetPlate);

    const similarity = this.calculateSimilarity(normalizedInput, normalizedTarget);
    const suggestions: string[] = [];

    // Generate suggestions for common OCR errors
    if (similarity > threshold - 0.2) {
      suggestions.push(...this.generateOCRSuggestions(normalizedInput));
    }

    return {
      isMatch: similarity >= threshold,
      similarity,
      suggestions: suggestions.slice(0, 5) // Limit to 5 suggestions
    };
  }

  // Calculate string similarity (Levenshtein distance based)
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1.length === 0) return str2.length === 0 ? 1 : 0;
    if (str2.length === 0) return 0;

    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  // Generate suggestions for common OCR errors
  private static generateOCRSuggestions(plateNumber: string): string[] {
    const suggestions: string[] = [];
    const ocrMappings: { [key: string]: string[] } = {
      '0': ['O', 'D', 'Q'],
      'O': ['0', 'D', 'Q'],
      'I': ['1', 'L', 'T'],
      '1': ['I', 'L', 'T'],
      '5': ['S', 'G'],
      'S': ['5', 'G'],
      'B': ['8', 'R'],
      '8': ['B', 'R'],
      '6': ['G', 'C'],
      'G': ['6', 'C'],
      '2': ['Z', 'R'],
      'Z': ['2', 'R']
    };

    // Generate suggestions by replacing common OCR errors
    for (let i = 0; i < plateNumber.length; i++) {
      const char = plateNumber[i];
      if (ocrMappings[char]) {
        for (const replacement of ocrMappings[char]) {
          const suggestion = plateNumber.substring(0, i) + replacement + plateNumber.substring(i + 1);
          suggestions.push(suggestion);
        }
      }
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  // Get plate number category (private, commercial, etc.)
  static getPlateCategory(plateNumber: string): string {
    const validation = this.validatePlateNumber(plateNumber);
    if (validation.isValid && validation.format) {
      return validation.format.category;
    }
    return 'unknown';
  }

  // Check if plate number is for commercial vehicle
  static isCommercialVehicle(plateNumber: string): boolean {
    const category = this.getPlateCategory(plateNumber);
    return category === 'commercial';
  }

  // Check if plate number is for government vehicle
  static isGovernmentVehicle(plateNumber: string): boolean {
    const category = this.getPlateCategory(plateNumber);
    return category === 'government' || category === 'military' || category === 'diplomatic';
  }
}