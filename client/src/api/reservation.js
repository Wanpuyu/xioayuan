import request from './request';

export function createReservation(data) {
  return request.post('/reservations', data);
}

export function getMyReservations(params) {
  return request.get('/reservations/mine', { params });
}

export function cancelMine(id) {
  return request.put(`/reservations/${id}/cancel`);
}

export function getAllReservations(params) {
  return request.get('/reservations', { params });
}

export function checkReservation(id) {
  return request.put(`/reservations/${id}/check`);
}

export function forceCancelReservation(id) {
  return request.put(`/reservations/${id}/force-cancel`);
}
