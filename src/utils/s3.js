/**
 * S3 utilities for presigned URLs and multipart uploads
 * Bucket: autoscopedev. Folders by inspection type: Interior, Exterior, Engine, etc.
 */

const {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { S3_BUCKET, AWS_REGION, INSPECTION_TYPES } = require('../config/constants');
const logger = require('./logger');

const DEFAULT_EXPIRES_IN_SECONDS = 900; // 15 min for photos
const DEFAULT_VIDEO_EXPIRES_IN_SECONDS = 7200; // 2 hours for large videos
const MULTIPART_PART_EXPIRES_IN_SECONDS = 3600; // 1 hour per part URL

const VALID_TYPE_NAMES = Object.values(INSPECTION_TYPES);

let _client = null;

function getS3Client() {
  if (!_client) {
    _client = new S3Client({ region: AWS_REGION });
  }
  return _client;
}

/**
 * Build public URL for an object in the bucket
 */
function getPublicUrl(key) {
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodedKey}`;
}

/**
 * Sanitize filename for S3 key (remove path, safe chars, limit length)
 */
function sanitizeFileName(fileName, maxLength = 200) {
  if (!fileName || typeof fileName !== 'string') return 'file';
  const base = fileName.replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, maxLength) || 'file';
}

/**
 * Sanitize inspection type name for use in path (must match INSPECTION_TYPES values)
 */
function sanitizeTypeName(typeName) {
  if (!typeName || typeof typeName !== 'string') return null;
  const t = typeName.trim();
  return VALID_TYPE_NAMES.includes(t) ? t : null;
}

/**
 * Build S3 key by inspection type: uploads/inspections/{inspectionId}/{typeName}/photos|videos/{uuid}-{filename}
 * Used for both single PUT and multipart uploads.
 * @param {string} inspectionId - Inspection document ID
 * @param {string} typeName - One of INSPECTION_TYPES (e.g. Interior, Exterior, Engine)
 * @param {'photos'|'videos'} mediaType - photos or videos folder
 * @param {string} fileName - Original file name
 * @returns {string} S3 key
 */
function buildInspectionMediaKey(inspectionId, typeName, mediaType, fileName) {
  const { randomUUID } = require('crypto');
  const safeType = sanitizeTypeName(typeName);
  if (!safeType) {
    throw new Error(`typeName must be one of: ${VALID_TYPE_NAMES.join(', ')}`);
  }
  const safeId = (inspectionId || '').toString().trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';
  const folder = mediaType === 'videos' ? 'videos' : 'photos';
  const safeName = sanitizeFileName(fileName);
  return `uploads/inspections/${safeId}/${safeType}/${folder}/${randomUUID()}-${safeName}`;
}

/**
 * Legacy: build key with optional folder (for backward compatibility)
 */
function buildUploadKey(folder, fileName) {
  const { randomUUID } = require('crypto');
  const safeName = sanitizeFileName(fileName);
  const prefix = folder && folder.trim() ? `uploads/${folder.trim().replace(/^\/+|\/+$/g, '')}` : 'uploads';
  return `${prefix}/${randomUUID()}-${safeName}`;
}

/**
 * Presigned PUT URL for single upload (photos or small videos)
 */
async function getPresignedPutUrl(key, contentType, expiresIn = DEFAULT_EXPIRES_IN_SECONDS) {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType || 'application/octet-stream'
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  logger.info('Presigned PUT URL generated', { key, bucket: S3_BUCKET, expiresIn });
  return url;
}

/**
 * Create multipart upload (for large videos – 10+ min). Client uploads parts then calls complete.
 */
async function createMultipartUpload(key, contentType) {
  const client = getS3Client();
  const command = new CreateMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType || 'video/mp4'
  });
  const response = await client.send(command);
  logger.info('Multipart upload created', { key, uploadId: response.UploadId, bucket: S3_BUCKET });
  return { uploadId: response.UploadId };
}

/**
 * Presigned URL for one part of a multipart upload
 */
async function getPresignedPartUrl(key, uploadId, partNumber, expiresIn = MULTIPART_PART_EXPIRES_IN_SECONDS) {
  const client = getS3Client();
  const command = new UploadPartCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber
  });
  const url = await getSignedUrl(client, command, { expiresIn });
  return url;
}

/**
 * Complete multipart upload. parts: [{ PartNumber, ETag }]
 */
async function completeMultipartUpload(key, uploadId, parts) {
  const client = getS3Client();
  const command = new CompleteMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag }))
    }
  });
  await client.send(command);
  logger.info('Multipart upload completed', { key, uploadId, bucket: S3_BUCKET });
  return getPublicUrl(key);
}

/**
 * Abort multipart upload (cleanup on client failure)
 */
async function abortMultipartUpload(key, uploadId) {
  const client = getS3Client();
  const command = new AbortMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId
  });
  await client.send(command);
  logger.info('Multipart upload aborted', { key, uploadId, bucket: S3_BUCKET });
}

/** Allowed prefix for delete – only inspection uploads */
const INSPECTION_UPLOADS_PREFIX = 'uploads/inspections/';

/**
 * Delete an object from S3. Key must start with uploads/inspections/ (inspection media only).
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
async function deleteObject(key) {
  const normalized = (key || '').trim();
  if (!normalized.startsWith(INSPECTION_UPLOADS_PREFIX)) {
    throw new Error(`Delete allowed only for keys under ${INSPECTION_UPLOADS_PREFIX}`);
  }
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: normalized
  });
  await client.send(command);
  logger.info('S3 object deleted', { key: normalized, bucket: S3_BUCKET });
}

/**
 * Extract S3 key from our bucket's public file URL (for delete by fileUrl).
 * Returns null if URL is not from our bucket.
 */
function keyFromFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  try {
    const u = new URL(fileUrl.trim());
    const pathname = u.pathname.replace(/^\/+/, '');
    const decoded = decodeURIComponent(pathname);
    const expectedHost = `${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;
    if (u.host !== expectedHost) return null;
    return decoded || null;
  } catch {
    return null;
  }
}

module.exports = {
  getS3Client,
  getPublicUrl,
  getPresignedPutUrl,
  sanitizeFileName,
  sanitizeTypeName,
  buildUploadKey,
  buildInspectionMediaKey,
  createMultipartUpload,
  getPresignedPartUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  deleteObject,
  keyFromFileUrl,
  INSPECTION_UPLOADS_PREFIX,
  S3_BUCKET,
  DEFAULT_EXPIRES_IN_SECONDS,
  DEFAULT_VIDEO_EXPIRES_IN_SECONDS,
  MULTIPART_PART_EXPIRES_IN_SECONDS,
  VALID_TYPE_NAMES
};
