/**
 * Webhook testing and dispatch simulator for CLI
 */
export declare function simulateWebhookCli(receiverId: string, event: string, payload: Record<string, any>, secret?: string, daemonUrl?: string): Promise<{
    status: number;
    body: string;
}>;
//# sourceMappingURL=webhook.d.ts.map