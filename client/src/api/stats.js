import request from './request';

export function getStatsOverview() {
  return request.get('/stats/overview');
}
