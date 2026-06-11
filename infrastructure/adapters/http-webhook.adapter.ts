import { Injectable, Logger } from '@nestjs/common';
import { WebhookPort, WebhookPayload } from '../../domain/ports/webhook.port';

@Injectable()
export class HttpWebhookAdapter implements WebhookPort {
  private readonly logger = new Logger(HttpWebhookAdapter.name);

  fire(payload: WebhookPayload): void {
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) {
      this.logger.warn('N8N_WEBHOOK_URL no configurada — notificación omitida');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(() => {
        clearTimeout(timeout);
        this.logger.log(`Webhook n8n OK → ${payload.monitor_email}`);
      })
      .catch((err: Error) => {
        clearTimeout(timeout);
        this.logger.error(`Webhook n8n ERROR: ${err.message}`);
      });
  }
}
