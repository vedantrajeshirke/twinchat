import { format, isToday, isYesterday, isThisYear, formatDistanceToNowStrict } from 'date-fns';

/** Compact stamp for conversation rows: 14:32 · Yesterday · 12 Mar · 12 Mar 2024 */
export function listTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, isThisYear(date) ? 'd MMM' : 'd MMM yyyy');
}

/** Time under a message bubble. */
export const bubbleTimestamp = (value) => (value ? format(new Date(value), 'HH:mm') : '');

/** Sticky separator between days in the message area. */
export function dayLabel(value) {
  const date = new Date(value);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, isThisYear(date) ? 'EEEE, d MMMM' : 'd MMMM yyyy');
}

export const sameDay = (a, b) =>
  new Date(a).toDateString() === new Date(b).toDateString();

export const relativeTime = (value) =>
  value ? `${formatDistanceToNowStrict(new Date(value))} ago` : '';
