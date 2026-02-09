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
    if (!AWS_REGION) {
      throw new Error('AWS_REGION environment variable is not set');
    }
    _client = new S3Client({ region: AWS_REGION });
    logger.info('S3 client initialized', { region: AWS_REGION, bucket: S3_BUCKET });
  }
  return _client;
}

/**
 * Normalize S3 key - ensure it's properly formatted (no leading/trailing slashes, no double slashes)
 * This prevents signature mismatch errors in presigned URLs
 */
function normalizeKey(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Key must be a non-empty string');
  }
  // Trim and remove leading/trailing slashes, collapse multiple slashes (avoids signature mismatch)
  return key.trim().replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

/**
 * Build public URL for an object in the bucket
 * Properly encodes path segments while preserving forward slashes
 */
function getPublicUrl(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Key must be a non-empty string');
  }
  
  // Normalize key first
  const normalizedKey = normalizeKey(key);
  
  // Split by forward slash, encode each segment separately, then join back
  // This preserves forward slashes while properly encoding special characters in filenames
  const encodedKey = normalizedKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
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
  try {
    // Normalize key to prevent signature mismatch errors
    const normalizedKey = normalizeKey(key);
    
    if (!S3_BUCKET) {
      throw new Error('S3_BUCKET environment variable is not set');
    }
    
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: normalizedKey,
      ContentType: contentType || 'application/octet-stream'
    });
    
    const url = await getSignedUrl(client, command, { expiresIn });
    logger.info('Presigned PUT URL generated', { 
      key: normalizedKey, 
      bucket: S3_BUCKET, 
      region: AWS_REGION,
      expiresIn,
      contentType 
    });
    return url;
  } catch (error) {
    logger.error('Error generating presigned PUT URL', error, { 
      key, 
      bucket: S3_BUCKET, 
      region: AWS_REGION,
      contentType 
    });
    throw error;
  }
}

/**
 * Create multipart upload (for large videos – 10+ min). Client uploads parts then calls complete.
 */
async function createMultipartUpload(key, contentType) {
  // Normalize key to prevent signature mismatch errors
  const normalizedKey = normalizeKey(key);
  
  const client = getS3Client();
  const command = new CreateMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: normalizedKey,
    ContentType: contentType || 'video/mp4'
  });
  const response = await client.send(command);
  logger.info('Multipart upload created', { key: normalizedKey, uploadId: response.UploadId, bucket: S3_BUCKET });
  return { uploadId: response.UploadId };
}

/**
 * Presigned URL for one part of a multipart upload
 */
async function getPresignedPartUrl(key, uploadId, partNumber, expiresIn = MULTIPART_PART_EXPIRES_IN_SECONDS) {
  // Normalize key to prevent signature mismatch errors
  const normalizedKey = normalizeKey(key);
  
  const client = getS3Client();
  const command = new UploadPartCommand({
    Bucket: S3_BUCKET,
    Key: normalizedKey,
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
  // Normalize key to prevent signature mismatch errors
  const normalizedKey = normalizeKey(key);
  
  const client = getS3Client();
  const command = new CompleteMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: normalizedKey,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag }))
    }
  });
  await client.send(command);
  logger.info('Multipart upload completed', { key: normalizedKey, uploadId, bucket: S3_BUCKET });
  return getPublicUrl(normalizedKey);
}

/**
 * Abort multipart upload (cleanup on client failure)
 */
async function abortMultipartUpload(key, uploadId) {
  // Normalize key to prevent signature mismatch errors
  const normalizedKey = normalizeKey(key);
  
  const client = getS3Client();
  const command = new AbortMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: normalizedKey,
    UploadId: uploadId
  });
  await client.send(command);
  logger.info('Multipart upload aborted', { key: normalizedKey, uploadId, bucket: S3_BUCKET });
}

/** Allowed prefix for delete – only inspection uploads */
const INSPECTION_UPLOADS_PREFIX = 'uploads/inspections/';

/**
 * Delete an object from S3. Key must start with uploads/inspections/ (inspection media only).
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
async function deleteObject(key) {
  // Normalize key to prevent signature mismatch errors
  const normalized = normalizeKey(key || '');
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
