export function formatExactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return Math.round(value).toLocaleString("en-US");
}

function formatScaledValue(scaled: number): string {
  const rounded = Math.round(scaled * 10) / 10;

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toFixed(1);
}

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs < 1000) {
    return `${sign}${Math.round(abs)}`;
  }

  if (abs >= 1_000_000_000) {
    return `${sign}${formatScaledValue(abs / 1_000_000_000)}B`;
  }

  if (abs >= 1_000_000) {
    return `${sign}${formatScaledValue(abs / 1_000_000)}M`;
  }

  return `${sign}${formatScaledValue(abs / 1_000)}K`;
}
