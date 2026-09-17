import request from './request';

/**
 * 上传图片，支持进度回调
 * @param {File} file
 * @param {(percent:number)=>void} onProgress
 */
export function uploadImage(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    }
  });
}

export function getUploadUsage() {
  return request.get('/upload/usage');
}
