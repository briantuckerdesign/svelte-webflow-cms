export function validateUrl(value: string): boolean {
  if (!value) return true; // Allow empty
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateEmail(value: string): boolean {
  if (!value) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function validatePhone(value: string): boolean {
  if (!value) return true;
  // Basic phone validation: allows +, -, (, ), space, and digits. Min 7 format chars.
  const phoneRegex = /^[\d\+\-\(\)\s]{7,}$/;
  return phoneRegex.test(value);
}

export function validateNumber(
  value: number | null | undefined,
  options: {
    format?: "integer" | "decimal";
    precision?: number;
    allowNegative?: boolean;
  } = {},
): boolean {
  if (value === null || value === undefined) return true;

  if (options.allowNegative === false && value < 0) {
    return false;
  }

  if (options.format === "integer") {
    return Number.isInteger(value);
  }

  // For decimal, we don't strictly validate precision here as that's often a formatting concern,
  // but we could check if it has more decimal places than allowed if needed.
  // For now, js numbers are floats, so just return true if it is a valid number.
  return !isNaN(value);
}
