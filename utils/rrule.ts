/**
 * RRULE utility functions for handling recurring events
 * Based on RFC 5545 iCalendar specification
 */

import { Frequency, RRule, rrulestr } from 'rrule';

export interface RecurrenceConfig {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number; // e.g., every 2 weeks
  byweekday?: number[]; // 0=Monday, 1=Tuesday, ..., 6=Sunday
  bymonthday?: number[]; // Day of month (1-31)
  bymonth?: number[]; // Month (1-12)
  count?: number; // Number of occurrences
  until?: Date; // End date
  dtstart: Date; // Start date
}

/**
 * Generate RRULE string from configuration
 */
export function generateRRULE(config: RecurrenceConfig): string {
  const freqMap: Record<string, Frequency> = {
    DAILY: Frequency.DAILY,
    WEEKLY: Frequency.WEEKLY,
    MONTHLY: Frequency.MONTHLY,
    YEARLY: Frequency.YEARLY,
  };

  const options: any = {
    freq: freqMap[config.frequency],
    dtstart: config.dtstart,
    interval: config.interval || 1,
  };

  if (config.byweekday && config.byweekday.length > 0) {
    const weekdayMap: Record<number, any> = {
      0: RRule.MO,
      1: RRule.TU,
      2: RRule.WE,
      3: RRule.TH,
      4: RRule.FR,
      5: RRule.SA,
      6: RRule.SU,
    };
    options.byweekday = config.byweekday.map((day) => weekdayMap[day]);
  }

  if (config.bymonthday && config.bymonthday.length > 0) {
    options.bymonthday = config.bymonthday;
  }

  if (config.bymonth && config.bymonth.length > 0) {
    options.bymonth = config.bymonth;
  }

  if (config.count) {
    options.count = config.count;
  }

  if (config.until) {
    options.until = config.until;
  }

  const rule = new RRule(options);
  return rule.toString();
}

/**
 * Parse RRULE string and return configuration
 */
export function parseRRULE(rruleString: string, dtstart: Date): RecurrenceConfig | null {
  try {
    const rule = rrulestr(rruleString, { dtstart });
    const options = rule.options;

    const config: RecurrenceConfig = {
      frequency: getFrequencyString(options.freq),
      dtstart: options.dtstart || dtstart,
      interval: options.interval || 1,
    };

    if (options.byweekday) {
      if (Array.isArray(options.byweekday)) {
        config.byweekday = options.byweekday.map((day: any) => {
          if (typeof day === 'number') return day;
          return day.weekday ?? day;
        });
      } else {
        const day = options.byweekday as any;
        config.byweekday = [typeof day === 'number' ? day : day.weekday ?? day];
      }
    }

    if (options.bymonthday) {
      config.bymonthday = Array.isArray(options.bymonthday) ? options.bymonthday : [options.bymonthday];
    }

    if (options.bymonth) {
      config.bymonth = Array.isArray(options.bymonth) ? options.bymonth : [options.bymonth];
    }

    if (options.count) {
      config.count = options.count;
    }

    if (options.until) {
      config.until = options.until;
    }

    return config;
  } catch (error) {
    console.error('Failed to parse RRULE:', error);
    return null;
  }
}

/**
 * Generate all occurrence dates from RRULE
 */
export function generateOccurrences(
  rruleString: string,
  dtstart: Date,
  endDate?: Date,
  maxCount?: number
): Date[] {
  try {
    const rule = rrulestr(rruleString, { dtstart });
    if (endDate) {
      return rule.between(dtstart, endDate, true);
    }
    if (maxCount) {
      const allOccurrences = rule.all();
      return allOccurrences.slice(0, maxCount);
    }
    // Default: generate next 100 occurrences
    const allOccurrences = rule.all();
    return allOccurrences.slice(0, 100);
  } catch (error) {
    console.error('Failed to generate occurrences:', error);
    return [];
  }
}

/**
 * Get human-readable description of recurrence pattern
 */
export function getRecurrenceDescription(rruleString: string, dtstart: Date): string {
  try {
    const config = parseRRULE(rruleString, dtstart);
    if (!config) return '';

    const frequencyMap: Record<string, string> = {
      DAILY: '每天',
      WEEKLY: '每週',
      MONTHLY: '每月',
      YEARLY: '每年',
    };

    let description = frequencyMap[config.frequency] || '';

    if (config.interval && config.interval > 1) {
      description = `每 ${config.interval} ${description}`;
    }

    if (config.byweekday && config.byweekday.length > 0) {
      const dayNames = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
      const days = config.byweekday.map((day) => dayNames[day]).join('、');
      description = `${description}${days}`;
    }

    if (config.bymonthday && config.bymonthday.length > 0) {
      description = `${description}${config.bymonthday.join('、')}號`;
    }

    if (config.count) {
      description = `${description}，共 ${config.count} 次`;
    }

    if (config.until) {
      const endDate = new Date(config.until);
      description = `${description}，至 ${endDate.toLocaleDateString('zh-TW')}`;
    }

    return description;
  } catch (error) {
    console.error('Failed to get recurrence description:', error);
    return '';
  }
}

/**
 * Helper function to convert RRule frequency to string
 */
function getFrequencyString(freq: Frequency): 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' {
  switch (freq) {
    case Frequency.DAILY:
      return 'DAILY';
    case Frequency.WEEKLY:
      return 'WEEKLY';
    case Frequency.MONTHLY:
      return 'MONTHLY';
    case Frequency.YEARLY:
      return 'YEARLY';
    default:
      return 'WEEKLY';
  }
}

/**
 * Validate RRULE string
 */
export function validateRRULE(rruleString: string, dtstart: Date): { valid: boolean; error?: string } {
  try {
    const rule = rrulestr(rruleString, { dtstart });
    // Try to generate at least one occurrence
    const occurrences = rule.all();
    if (occurrences.length === 0) {
      return { valid: false, error: '無法生成任何活動日期' };
    }
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error?.message || '無效的重複規則' };
  }
}

