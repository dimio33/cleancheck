declare module 'web-push' {
  interface PushSubscription {
    endpoint: string;
    keys: {
      auth: string;
      p256dh: string;
    };
  }

  interface SendResult {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  }

  interface WebPushError extends Error {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    endpoint: string;
  }

  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  function sendNotification(subscription: PushSubscription, payload?: string | Buffer | null, options?: object): Promise<SendResult>;
  function generateVAPIDKeys(): { publicKey: string; privateKey: string };

  export { PushSubscription, SendResult, WebPushError };
  export default { setVapidDetails, sendNotification, generateVAPIDKeys };
}
