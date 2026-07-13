import crypto from "crypto"
import type { TrelloWebhook, RawTrelloCard } from "../../types/trello.js"
import { LangOpsApiClient } from "../subscribers/langopsAPI.js"

export class TrelloAdapter {

    private readonly callbackUrl: string
    private readonly trelloBoardId: string
    private readonly trelloSecret: string
    private readonly trelloKey: string
    private readonly trelloToken: string
    

    

    constructor() {
        this.callbackUrl = process.env.TRELLO_CALLBACK_URL ?? ""
        this.trelloBoardId = process.env.TRELLO_BOARD_ID ?? ""
        this.trelloSecret = process.env.TRELLO_SECRET ?? ""
        this.trelloKey = process.env.TRELLO_KEY ?? ""
        this.trelloToken = process.env.TRELLO_TOKEN ?? ""

        

        if (
            !this.callbackUrl ||
            !this.trelloBoardId ||
            !this.trelloSecret ||
            !this.trelloKey ||
            !this.trelloToken
        ) {
            throw new Error("Cannot init Trello Adapter: missing one or more environment variables.")
        }
    }

    public verifySignature(rawBody: string, signature: string): boolean | undefined {
        const content = rawBody + this.callbackUrl;
        if (this.trelloSecret) {
            const computedSignature = crypto
            .createHmac('sha1', this.trelloSecret)
            .update(content)
            .digest('base64')
        
            const sigBuf = Buffer.from(signature);
            const computedBuf = Buffer.from(computedSignature);

            if (sigBuf.length !== computedBuf.length) return false;

            return crypto.timingSafeEqual(sigBuf, computedBuf);
        }
        
    }

    public async getCard(id: string): Promise<RawTrelloCard> {
        const response = await fetch(
            `https://api.trello.com/1/cards/${id}?key=${this.trelloKey}&token=${this.trelloToken}&fields=name,dateLastActivity,due,url,dateClosed&actions=all&attachments=true&attachment_fields=all&customFieldItems=true`, {
                headers: {
                    accept: 'application-json'
                },
                method: 'GET'
            }
        )
        const card: RawTrelloCard = await response.json() as RawTrelloCard
        return card
    }


    public async processWebhook(webhook: TrelloWebhook) {
        try {
            // Read webhoook
            const actionType = webhook.action?.type ?? null
            const cardId = webhook.action?.data?.card?.id ?? null

            // fetch full data from updated card
            const card = await this.getCard(cardId)

            // Set up client for API requests
            const client = new LangOpsApiClient()

            
            // In our standard LangOps-Blackbird workflow, card is copied from template. We also monitor "createCard" action in case a card is created manually.
            if (actionType === "copyCard" || actionType === "createCard") {
                await client.addProduct(card)

            /*
            * Applies when checkbox, title or other fields updated on card
            * The updateCard action also fires when card is archived
            */ 
            } else if (actionType === "updateCheckItemStateOnCard" || actionType === "updateCard") {
                await client.editProduct(card)

            
            // Corresponds to delete (not archive) in Trello
            } else if (actionType === "deleteCard") {
                await client.deleteProduct(card)
            
            } else {
                console.log("Webhook action not supported")
            }
        
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(error.message); // Safely typed as string
                console.error(error.stack);   // Safely typed as string or undefined
            } else {
                console.error("An unexpected error occurred:", error)
            }
        }  
   }
}
