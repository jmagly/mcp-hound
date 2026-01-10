/**
 * Gitea Webhook Handler
 *
 * Handles Gitea webhook events to auto-sync Hound index when repos are created/deleted.
 */

import { execSync } from 'node:child_process';
import { createHmac } from 'node:crypto';

/**
 * Configuration from environment
 */
const WEBHOOK_SECRET = process.env.HOUND_WEBHOOK_SECRET || '';
const HOUND_CONFIG_DIR = process.env.HOUND_CONFIG_DIR || '';
const GITEA_TOKEN = process.env.GITEA_TOKEN || '';

/**
 * Gitea webhook payload (simplified)
 */
interface GiteaWebhookPayload {
  action?: string; // 'created', 'deleted' for repository events
  repository?: {
    full_name: string;
    name: string;
    owner: {
      login: string;
    };
  };
}

/**
 * Webhook response
 */
export interface WebhookResponse {
  success: boolean;
  message: string;
  action?: string;
}

/**
 * Verify Gitea webhook signature
 */
function verifySignature(payload: string, signature: string | undefined): boolean {
  if (!WEBHOOK_SECRET) {
    // No secret configured, skip verification
    return true;
  }

  if (!signature) {
    return false;
  }

  const expected = createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
  return signature === expected || signature === `sha256=${expected}`;
}

/**
 * Regenerate Hound config from Gitea repos
 */
function regenerateConfig(): { success: boolean; message: string } {
  try {
    console.error('[webhook] Regenerating Hound config...');

    // Run generate-config.sh
    const env = { ...process.env, GITEA_TOKEN };
    execSync('./generate-config.sh config.json', {
      cwd: HOUND_CONFIG_DIR,
      env,
      stdio: 'pipe',
      timeout: 30000,
    });

    console.error('[webhook] Config regenerated, restarting Hound...');

    // Restart Hound container
    execSync('sudo docker compose restart hound', {
      cwd: HOUND_CONFIG_DIR,
      stdio: 'pipe',
      timeout: 60000,
    });

    console.error('[webhook] Hound restarted successfully');
    return { success: true, message: 'Hound index updated' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[webhook] Failed to update Hound: ${message}`);
    return { success: false, message: `Failed to update Hound: ${message}` };
  }
}

/**
 * Handle Gitea webhook request
 */
export function handleGiteaWebhook(
  eventType: string | undefined,
  signature: string | undefined,
  payload: string
): WebhookResponse {
  // Verify signature if configured
  if (!verifySignature(payload, signature)) {
    console.error('[webhook] Invalid signature');
    return { success: false, message: 'Invalid signature' };
  }

  // Parse payload
  let data: GiteaWebhookPayload;
  try {
    data = JSON.parse(payload);
  } catch {
    console.error('[webhook] Invalid JSON payload');
    return { success: false, message: 'Invalid JSON payload' };
  }

  console.error(`[webhook] Received event: ${eventType}, action: ${data.action}`);

  // Handle repository events
  if (eventType === 'repository') {
    const repoName = data.repository?.full_name || 'unknown';

    if (data.action === 'created') {
      console.error(`[webhook] New repo created: ${repoName}`);
      const result = regenerateConfig();
      return { ...result, action: `indexed new repo: ${repoName}` };
    }

    if (data.action === 'deleted') {
      console.error(`[webhook] Repo deleted: ${repoName}`);
      const result = regenerateConfig();
      return { ...result, action: `removed deleted repo: ${repoName}` };
    }
  }

  // Ignore other events
  return {
    success: true,
    message: 'Event ignored',
    action: `ignored ${eventType || 'unknown'} event`,
  };
}

/**
 * Manually trigger Hound sync (for admin use)
 */
export function triggerSync(): WebhookResponse {
  console.error('[webhook] Manual sync triggered');
  const result = regenerateConfig();
  return { ...result, action: 'manual sync' };
}
