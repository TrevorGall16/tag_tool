// Re-export the Stripe webhook handler from its primary location
// This allows the webhook URL to be /api/webhooks/stripe
// The actual implementation is at /api/stripe/webhook
export { POST } from "@/app/api/stripe/webhook/route";
