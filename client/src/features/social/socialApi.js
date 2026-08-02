import { post } from '../../utils/api.js';

export function helpGarden(helperUsername, ownerUsername) {
  return post('/api/garden/help', { helperUsername, ownerUsername });
}
