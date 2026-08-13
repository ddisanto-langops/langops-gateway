import crypto from "crypto"
import type { TrelloWebhook, RawTrelloCard } from "../../types/trello.js"
import { LangOpsApiClient } from "../subscribers/langopsAPI.js"
import { log } from "console"

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
            if (!actionType) {
                console.error("Trello webhook does not specify action type")
                return
            }

            const cardId = webhook.action?.data?.card?.id ?? null
            const cardName = webhook.action?.data?.card?.name ?? null

            // Set up client for API requests
            const client = new LangOpsApiClient()
            
            /*
            *   In our standard LangOps-Blackbird workflow, new cards are copied from templates. 
            *   When a Blackbird flight fails to create a Trello card, it is created manually.
            *   For this reason we also monitor the "createCard" action.
            */ 
            if (actionType === "copyCard" || actionType === "createCard") {
                const card = await this.getCard(cardId)
                const response = await client.addProduct(card)
                if (response.ok) {
                    console.log(`Created: ${cardName}`)
                } else {
                    const logRes = await client.logFailedWebhook("create", webhook)
                    if (logRes.ok) {
                        console.log(`Logged failure sending webhook to subscriber: status ${response}.`)
                    } else {
                        console.log(`Error logging failure to communicate with subscriber: status ${logRes}`)
                    }}
            /*
            *   Applies when checkbox, title or other fields updated on card
            *   The updateCard action also fires when card is archived
            */ 
            } else if (actionType === "updateCheckItemStateOnCard" || actionType === "updateCard" || actionType === "updateCustomFieldItem") {
                const card = await this.getCard(cardId)
                const res = await client.editProduct(card)
                switch (res.status) {
                    case 200:
                        console.log(`Edited: ${cardName}`)
                        break
                    
                    case 404: // if not found, try to create the product
                        await client.addProduct(card)
                        console.log(`Created: ${cardName}`)
                        break
                    
                    default:
                        const logRes = await client.logFailedWebhook("edit", webhook)
                        if (logRes.status === 201) {
                            console.log(`Logged failure sending webhook to subscriber: status ${res}.`)
                        } else {
                            console.log(`Error logging failure to communicate with subscriber: status ${logRes}`)
                        }
                }
                
            
            // Usually attachments are links
            } else if (actionType === "addAttachmentToCard") {
                const card = await this.getCard(cardId)
                const res = await client.editProduct(card)
                switch (res.status) {
                    case 200:
                        console.log(`Edited: ${cardName}`)
                        break
                    
                    case 404:
                        await client.addProduct(card)
                        console.log(`Created: ${cardName}`)
                        break
                    
                    default:
                        const logRes = await client.logFailedWebhook("edit", webhook)
                        if (logRes.status === 200) {
                            console.log(`Logged failure sending webhook to subscriber: status ${res}.`)
                        } else {
                            console.log(`Error logging failure to communicate with subscriber: status ${logRes}`)
                        }
                }
            
            
            // Corresponds to delete (not archive) in Trello
            } else if (actionType === "deleteCard") {
                const res = await client.deleteProduct(cardId)
                switch (res.status) {
                    case 200:
                        console.log(`Deleted: ${cardName}`)
                        break
                    
                    default:
                        const logRes = await client.logFailedWebhook("delete", webhook)
                        if (logRes.status === 200) {
                            console.log(`Logged failure sending webhook to subscriber: status ${res}.`)
                        } else {
                            console.log(`Error logging failure to communicate with subscriber: status ${logRes}`)
                        }
                }
            }
            
        
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(error.message)
                console.error(error.stack) 
            } else {
                console.error("An unexpected error occurred:", error)
            }
        }  
   }
}
