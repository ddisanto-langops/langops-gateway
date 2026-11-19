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

    public verifySignature(rawBody: string, signature: string): boolean {
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
        } else {
            return false
        }
    }

    public async getCard(id: string): Promise<RawTrelloCard | undefined> {
        const response = await fetch(
            `https://api.trello.com/1/cards/${id}?key=${this.trelloKey}&token=${this.trelloToken}&fields=name,dateLastActivity,due,url,dateClosed&actions=all&attachments=true&attachment_fields=all&customFieldItems=true`, {
                headers: {
                    accept: 'application-json'
                },
                method: 'GET'
            }
        )
        if (!response.ok) {
            console.error(`Failed to get card ${id}`)
            return
        } else {
            const card: RawTrelloCard = await response.json() as RawTrelloCard
            return card
        }
    }


    public async processWebhook(webhook: TrelloWebhook) {
        try {
            // Read webhoook
            const actionType = webhook.action?.type ?? null
            const cardId = webhook.action?.data?.card?.id ?? null
            const cardName = webhook.action?.data?.card?.name ?? null

            if (!actionType || !cardId || !cardName) {
                console.error("Ignoring malformed Trello webhook: missing action type, ID or name.")
                return
            }

            // Set up client for API requests
            const client = new LangOpsApiClient()
            
            /*
            *   In our standard Blackbird workflow, new cards are copied from templates. 
            *   If a Blackbird flight fails to create a Trello card, it is created manually.
            *   For this reason we also monitor the "createCard" action.
            */ 
            if (actionType === "copyCard" || actionType === "createCard") {
                const card = await this.getCard(cardId)
                if (!card) return
                
                const response = await client.addProduct(card)
                if (response.ok) {
                    console.log(`Created: ${cardName}`)
                } else {
                    await client.logInvalidRequest(response.status.toString(), webhook)
                }
            /*
            *   Applies when checkbox, title or other fields updated on card
            *   The updateCard action also fires when card is archived
            */ 
            } else if (actionType === "updateCheckItemStateOnCard" || actionType === "updateCard" || actionType === "updateCustomFieldItem") {
                const card = await this.getCard(cardId)
                if (!card) return

                const response = await client.editProduct(card)
                switch (response.status) {
                    case 200:
                        console.log(`Edited: ${cardName}`)
                        break

                    case 404: // if not found, try to create the product
                        console.log(`Card '${cardName}' not found, attempting to create...`)
                        const createResponse = await client.addProduct(card)
                        if (createResponse.ok) {
                            console.log(`Created: ${cardName}`)
                        } else {
                            console.log(`Failed to create new card: client returned status ${createResponse.status} for card ${cardName}.`)
                            await client.logInvalidRequest(response.status.toString(), webhook)
                        }
                        break
                    
                    default:
                        await client.logInvalidRequest(response.status.toString(), webhook)
                        break
                }
                
            
            // Usually attachments are links
            } else if (actionType === "addAttachmentToCard") {
                const card = await this.getCard(cardId)
                if (!card) return

                const response = await client.editProduct(card)
                switch (response.status) {
                    case 200:
                        console.log(`Edited: ${cardName}`)
                        break
                    
                    case 404: // try to add the product if not found
                        const editResponse = await client.addProduct(card)
                        if (editResponse.ok) {
                            console.log(`Created: ${cardName}`)
                        } else {
                            await client.logInvalidRequest(response.status.toString(), webhook)
                        }
                        break
                    
                    default:
                        await client.logInvalidRequest(response.status.toString(), webhook)
                }
            
            
            // Corresponds to delete (not archive) in Trello
            } else if (actionType === "deleteCard") {
                const response = await client.deleteProduct(cardId) // soft-delete in LangOps DB
                switch (response.status) {
                    case 200:
                        console.log(`Deleted: ${cardName}`)
                        break
                    
                    default:
                        await client.logInvalidRequest(response.status.toString(), webhook)
                }
            } else {
                console.log(`Ignored unsupported card action (${cardName}).`)
            }
            
        
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(`\nError processing card: ${error.message}`)
                console.error(`Traceback: ${error.stack}`) 
            } else {
                console.error("\nAn unexpected error occurred:", error)
            }
        }  
   }
}
