import crypto from 'crypto';

export class TrelloAdapter {

    private readonly CALLBACK_URL = process.env.CALLBACK_URL || ''
    private readonly TRELLO_SECRET = process.env.TRELLO_SECRET || ''
    private readonly FORWARD_TARGET_URL = process.env.FORWARD_TARGET_URL || ''

    verifyTrelloSignature(rawBody: string, signature: string): boolean {
        const content = rawBody + this.CALLBACK_URL;
        
        const computedSignature = crypto
            .createHmac('sha1', this.TRELLO_SECRET)
            .update(content)
            .digest('base64');

        // Use timingSafeEqual to guard against timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(computedSignature)
        );
    }

    forward(data: any) {
        /**
         * @param data: the parsed JSON data to forward
         */
        fetch(this.FORWARD_TARGET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
        }).catch(err => console.error(`Failed forwarding payload downstream:`, err.message));

    }
}