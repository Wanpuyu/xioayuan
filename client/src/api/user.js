import request from './request';

export function getUsers(params) {
  return request.get('/users', { params });
}

export function updateUser(id, data) {
  return request.put(`/users/${id}`, data);
}
