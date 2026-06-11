export const WEBHOOK_PORT = 'WEBHOOK_PORT';

export interface WebhookPayload {
  monitor_email: string;
  monitor_name: string;
  sede: string;
  room: string;
  fecha: string;
  start_time: string;
  end_time: string;
}

export interface WebhookPort {
  fire(payload: WebhookPayload): void;
}
