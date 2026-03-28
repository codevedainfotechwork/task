import { BASE_URL } from '../api';

export function resolveAssetUrl(value) {
  if (!value) return '';
  if (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  if (value.startsWith('/uploads/')) {
    return `${BASE_URL}${value}`;
  }
  return value;
}
