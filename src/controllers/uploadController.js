/**
 * Upload Controller
 * S3 presigned + multipart (bucket: autoscopedev, folders by type: Interior, Exterior, Engine, etc.)
 */

const uploadService = require('../services/uploadService');
const { success } = require('../utils/response');

/**
 * Single presigned PUT – photos or small videos. Key: inspections/{id}/{typeName}/photos|videos/...
 */
const getPresignedUploadUrl = async (params, currentUser) => {
  const result = await uploadService.getPresignedUploadUrl(params, currentUser);
  return success({
    message: 'Presigned URL generated. Upload with PUT to uploadUrl, then use fileUrl in inspection payload.',
    data: result
  });
};

/**
 * Init multipart upload for large videos (10+ min). Returns uploadId, key, fileUrl.
 */
const initMultipartUpload = async (params, currentUser) => {
  const result = await uploadService.initMultipartUpload(params, currentUser);
  return success({
    message: 'Multipart upload initiated. Request part URLs then complete with parts[].etag.',
    data: result
  });
};

/**
 * Get presigned URLs for one or more parts. parts: [{ partNumber, uploadUrl }].
 */
const getMultipartPartUrls = async (params, currentUser) => {
  const result = await uploadService.getMultipartPartUrls(params, currentUser);
  return success({
    message: 'Part URLs generated. PUT each part, then pass returned ETag in complete.',
    data: result
  });
};

/**
 * Complete multipart upload. Returns fileUrl to use in inspection.
 */
const completeMultipart = async (params, currentUser) => {
  const result = await uploadService.completeMultipart(params, currentUser);
  return success({
    message: 'Multipart upload completed. Use data.fileUrl in inspection payload.',
    data: result
  });
};

/**
 * Abort multipart upload (cleanup on failure).
 */
const abortMultipart = async (params, currentUser) => {
  await uploadService.abortMultipart(params, currentUser);
  return success({ message: 'Multipart upload aborted.', data: { aborted: true } });
};

/**
 * Delete image or video from S3. Provide key or fileUrl (from inspection).
 */
const deleteMedia = async (params, currentUser) => {
  const result = await uploadService.deleteMedia(params, currentUser);
  return success({
    message: 'Media deleted from S3. Remove the URL from the inspection document if still present.',
    data: result
  });
};

module.exports = {
  getPresignedUploadUrl,
  initMultipartUpload,
  getMultipartPartUrls,
  completeMultipart,
  abortMultipart,
  deleteMedia
};
