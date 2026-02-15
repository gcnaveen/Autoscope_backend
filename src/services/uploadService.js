/**
 * Upload service – S3 presigned and multipart uploads
 * Bucket: autoscopedev. Folders by inspection type: Interior, Exterior, Engine, etc.
 * Use single PUT for photos/small files; use multipart for large videos (10+ min).
 */

const {
  getPresignedPutUrl,
  getPublicUrl,
  buildInspectionMediaKey,
  createMultipartUpload,
  getPresignedPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  deleteObject,
  keyFromFileUrl,
  INSPECTION_UPLOADS_PREFIX,
  DEFAULT_EXPIRES_IN_SECONDS,
  DEFAULT_VIDEO_EXPIRES_IN_SECONDS,
  MULTIPART_PART_EXPIRES_IN_SECONDS,
  VALID_TYPE_NAMES
} = require('../utils/s3');
const { BadRequestError, ForbiddenError } = require('../utils/errors');
const { USER_ROLES } = require('../config/constants');
const logger = require('../utils/logger');

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm'
];

const ALLOWED_CONTENT_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

function isVideoContentType(contentType) {
  return ALLOWED_VIDEO_TYPES.includes((contentType || '').toLowerCase());
}

function mediaTypeFromContentType(contentType) {
  return isVideoContentType(contentType) ? 'videos' : 'photos';
}

function assertInspectorOrAdmin(currentUser) {
  if (!currentUser) throw new BadRequestError('Authentication required');
  if (currentUser.role !== USER_ROLES.INSPECTOR && currentUser.role !== USER_ROLES.ADMIN) {
    throw new ForbiddenError('Only inspectors and admins can upload inspection media');
  }
}

function validateContentType(contentType) {
  const normalized = (contentType || '').trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.includes(normalized)) {
    throw new BadRequestError(
      `contentType must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')} (images) or ${ALLOWED_VIDEO_TYPES.join(', ')} (videos)`
    );
  }
  return normalized;
}

function validateTypeName(typeName) {
  const t = (typeName || '').trim();
  if (!VALID_TYPE_NAMES.includes(t)) {
    throw new BadRequestError(`typeName must be one of: ${VALID_TYPE_NAMES.join(', ')}`);
  }
  return t;
}

/**
 * Single presigned PUT – use for photos and small videos.
 * Key: uploads/inspections/{inspectionId}/{typeName}/photos|videos/{uuid}-{fileName}
 * For videos we use longer expiry (2h default) so 10+ min uploads have time.
 */
async function getPresignedUploadUrl(params, currentUser) {
  assertInspectorOrAdmin(currentUser);

  const {
    // inspectionId,
    inspectionRequestId,
    typeName,
    fileName,
    contentType,
    mediaType: explicitMediaType,
    expiresIn
  } = params;

  // Allow either inspectionId or inspectionRequestId for folder grouping.
  // Strip all whitespace/newlines so the key never breaks the presigned URL.
  const rawId = (params.inspectionRequestId ?? params.inspectionId ?? '').toString().trim();
  const folderId = rawId.replace(/\s+/g, '');
  if (!folderId) {
    throw new BadRequestError('Either inspectionId or inspectionRequestId is required');
  }
  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    throw new BadRequestError('fileName is required');
  }
  if (!contentType || typeof contentType !== 'string' || !contentType.trim()) {
    throw new BadRequestError('contentType is required');
  }

  const normalizedType = validateContentType(contentType);
  validateTypeName(typeName);

  const mediaType = explicitMediaType === 'videos' || explicitMediaType === 'photos'
    ? explicitMediaType
    : mediaTypeFromContentType(normalizedType);

  // Use folderId (inspection or request ID) purely for S3 key organization
  const key = buildInspectionMediaKey(folderId, typeName, mediaType, fileName);

  const isVideo = mediaType === 'videos';
  const defaultExpires = isVideo ? DEFAULT_VIDEO_EXPIRES_IN_SECONDS : DEFAULT_EXPIRES_IN_SECONDS;
  const maxExpires = isVideo ? 14400 : 3600; // video: up to 4h, photo: 1h
  const expires = Math.min(Math.max(parseInt(expiresIn, 10) || defaultExpires, 60), maxExpires);

  const uploadUrl = await getPresignedPutUrl(key, normalizedType, expires);
  const fileUrl = getPublicUrl(key);

  logger.info('Presigned upload URL issued', {
    key,
    // inspectionId,
    inspectionRequestId,
    folderId,
    typeName,
    mediaType,
    contentType: normalizedType,
    userId: currentUser._id || currentUser.id
  });

  return { uploadUrl, fileUrl, key };
}

/**
 * Init multipart upload for large videos. Returns uploadId and key; client then requests part URLs and completes.
 * Accepts either inspectionRequestId or inspectionId for folder grouping (same as getPresignedUploadUrl).
 */
async function initMultipartUpload(params, currentUser) {
  assertInspectorOrAdmin(currentUser);

  const { typeName, fileName, contentType } = params;

  // Allow either inspectionId or inspectionRequestId for folder grouping (same as presigned PUT)
  const rawId = (params.inspectionRequestId ?? params.inspectionId ?? '').toString().trim();
  const folderId = rawId.replace(/\s+/g, '');
  if (!folderId) {
    throw new BadRequestError('Either inspectionId or inspectionRequestId is required');
  }
  if (!typeName || typeof typeName !== 'string' || !typeName.trim()) {
    throw new BadRequestError('typeName is required');
  }
  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    throw new BadRequestError('fileName is required');
  }
  if (!contentType || typeof contentType !== 'string' || !contentType.trim()) {
    throw new BadRequestError('contentType is required');
  }

  const normalizedType = validateContentType(contentType);
  if (!isVideoContentType(normalizedType)) {
    throw new BadRequestError('Multipart upload is only for videos. Use presigned PUT for images.');
  }
  validateTypeName(typeName);

  const key = buildInspectionMediaKey(folderId, typeName, 'videos', fileName);
  const { uploadId } = await createMultipartUpload(key, normalizedType);
  const fileUrl = getPublicUrl(key);

  logger.info('Multipart upload initiated', {
    key,
    uploadId,
    folderId,
    inspectionRequestId: params.inspectionRequestId,
    inspectionId: params.inspectionId,
    typeName,
    userId: currentUser._id || currentUser.id
  });

  return { uploadId, key, fileUrl };
}

/**
 * Get presigned URLs for one or more parts. parts: [1,2,3] -> [{ partNumber, uploadUrl }, ...]
 */
async function getMultipartPartUrls(params, currentUser) {
  assertInspectorOrAdmin(currentUser);

  const { key, uploadId, partNumbers, expiresIn } = params;

  if (!key || !uploadId) {
    throw new BadRequestError('key and uploadId are required');
  }
  if (!Array.isArray(partNumbers) || partNumbers.length === 0) {
    throw new BadRequestError('partNumbers must be a non-empty array (1-based)');
  }
  if (partNumbers.length > 10000) {
    throw new BadRequestError('Maximum 10000 parts per upload');
  }

  const expires = Math.min(Math.max(parseInt(expiresIn, 10) || MULTIPART_PART_EXPIRES_IN_SECONDS, 300), 3600);
  const parts = [];
  for (const partNumber of partNumbers) {
    const num = parseInt(partNumber, 10);
    if (num < 1 || num > 10000) continue;
    const uploadUrl = await getPresignedPartUrl(key, uploadId, num, expires);
    parts.push({ partNumber: num, uploadUrl });
  }

  if (parts.length === 0) {
    throw new BadRequestError('No valid part numbers (must be 1–10000)');
  }

  return { parts };
}

/**
 * Complete multipart upload. parts: [{ partNumber, etag }]. Returns final fileUrl.
 */
async function completeMultipart(params, currentUser) {
  assertInspectorOrAdmin(currentUser);

  const { key, uploadId, parts } = params;

  if (!key || !uploadId) {
    throw new BadRequestError('key and uploadId are required');
  }
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new BadRequestError('parts array is required (from part ETags after upload)');
  }

  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  for (const p of sorted) {
    if (!p.partNumber || !p.etag) {
      throw new BadRequestError('Each part must have partNumber and etag');
    }
  }

  const fileUrl = await completeMultipartUpload(key, uploadId, sorted);

  logger.info('Multipart upload completed', { key, uploadId, userId: currentUser._id || currentUser.id });

  return { fileUrl, key };
}

/**
 * Abort multipart upload (cleanup if client gives up)
 */
async function abortMultipart(params, currentUser) {
  assertInspectorOrAdmin(currentUser);

  const { key, uploadId } = params;
  if (!key || !uploadId) {
    throw new BadRequestError('key and uploadId are required');
  }
  await abortMultipartUpload(key, uploadId);
  return { aborted: true };
}

/**
 * Delete an image or video from S3. Inspector or admin only.
 * Provide either key (S3 object key) or fileUrl (the URL stored in the inspection).
 * Only keys under uploads/inspections/ can be deleted.
 */
async function deleteMedia(params, currentUser) {
  assertInspectorOrAdmin(currentUser);

  const { key, fileUrl } = params;
  let resolvedKey = null;

  if (key && typeof key === 'string' && key.trim()) {
    resolvedKey = key.trim();
  } else if (fileUrl && typeof fileUrl === 'string' && fileUrl.trim()) {
    resolvedKey = keyFromFileUrl(fileUrl);
    if (!resolvedKey) {
      throw new BadRequestError('fileUrl is not a valid inspection media URL from this bucket');
    }
  } else {
    throw new BadRequestError('Either key or fileUrl is required');
  }

  if (!resolvedKey.startsWith(INSPECTION_UPLOADS_PREFIX)) {
    throw new BadRequestError(`Delete allowed only for inspection media (key under ${INSPECTION_UPLOADS_PREFIX})`);
  }

  await deleteObject(resolvedKey);

  logger.info('Inspection media deleted from S3', {
    key: resolvedKey,
    userId: currentUser._id || currentUser.id
  });

  return { deleted: true, key: resolvedKey };
}

/**
 * Simple unrestricted image upload - no inspectionId, typeName, or other conditions required
 * Key: uploads/images/{uuid}-{fileName}
 * Only images allowed (no videos)
 */
async function getSimpleImageUploadUrl(params, currentUser) {
  assertInspectorOrAdmin(currentUser);

  const { fileName, contentType, expiresIn } = params;

  if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
    throw new BadRequestError('fileName is required');
  }
  if (!contentType || typeof contentType !== 'string' || !contentType.trim()) {
    throw new BadRequestError('contentType is required');
  }

  const normalizedType = validateContentType(contentType);
  
  // Only allow images for simple upload
  if (!ALLOWED_IMAGE_TYPES.includes(normalizedType)) {
    throw new BadRequestError(`Only image types are allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  // Build simple key: uploads/images/{uuid}-{fileName}
  const { randomUUID } = require('crypto');
  const { sanitizeFileName } = require('../utils/s3');
  const safeName = sanitizeFileName(fileName);
  const key = `uploads/images/${randomUUID()}-${safeName}`;

  const expires = Math.min(Math.max(parseInt(expiresIn, 10) || DEFAULT_EXPIRES_IN_SECONDS, 60), 3600);
  // Same as presigned-url: no ACL so upload works with S3 Block Public Access enabled
  const uploadUrl = await getPresignedPutUrl(key, normalizedType, expires);
  const fileUrl = getPublicUrl(key);

  logger.info('Simple image upload URL issued', {
    key,
    fileName,
    contentType: normalizedType,
    userId: currentUser._id || currentUser.id
  });

  return { uploadUrl, fileUrl, key };
}

module.exports = {
  getPresignedUploadUrl,
  initMultipartUpload,
  getMultipartPartUrls,
  completeMultipart,
  abortMultipart,
  deleteMedia,
  getSimpleImageUploadUrl,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_CONTENT_TYPES,
  isVideoContentType,
  mediaTypeFromContentType
};
