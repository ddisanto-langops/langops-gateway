import crypto from 'crypto';
import type { TrelloWebhook, RawTrelloCard } from "../../types/trello"
import { LangOpsApiClient } from "../subscribers/langopsAPI"

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
            .digest('base64');

        const compare = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(computedSignature)
        );

        return compare
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


    public async getActiveCards(since?: string): Promise<RawTrelloCard[]> {
        /**
         * Fetches all cards on the board (specified by Trello Board ID)
         * where the card is not archived (i.e. dateClosed property is null).
         * @param since Optional parmaeter to fetch cards starting at a certain date. 
         * If no date is specified, cards from only the last 24 hours are fetched.
        */
        
        const date = new Date();
        date.setDate(date.getDate() -1)
        const yesterday = date.toISOString().split('T')[0]
    
        try {
            const response = await fetch(
                `https://api.trello.com/1/boards/${this.trelloBoardId}/cards?key=${this.trelloKey}&token=${this.trelloToken}&fields=all&attachments=true&attachment_fields=all&customFieldItems=true&actions=all&since=${since ?? yesterday}`,
                { method: 'GET' }
            )
            if (!response.ok) {
                throw new Error(`Trello API error: ${response.statusText}`)
            }
            const cards: RawTrelloCard[] = await response.json() as RawTrelloCard[]
            
            return cards
            
        } catch (error) {
            error instanceof Error ? console.log(`Get Active Cards: ${error.message}`) : 
                console.log("Get Active Cards: Unkown error")
            return []
        }
    }


    public async getArchivedCards(since?: string): Promise<RawTrelloCard[]> {
        
        const date = new Date();
        date.setDate(date.getDate() -1)
        const yesterday = date.toISOString().split('T')[0]
    
        try {
            const response = await fetch(
                `https://api.trello.com/1/boards/${this.trelloBoardId}/cards?key=${this.trelloKey}&token=${this.trelloToken}&filter=closed&fields=name,idLabels,labels,due,dateLastActivity,url,isTemplate&attachments=true&attachment_fields=name,url&customFieldItems=true&actions=all&since=${since ?? yesterday}`,
                { method: 'GET' }
            )
            if (!response.ok) {
                throw new Error(`Trello API error: ${response.statusText}`)
            }
            const cards: RawTrelloCard[] = await response.json() as RawTrelloCard[]
            return cards

        } catch (error) {
            error instanceof Error ? console.log(`Get Arhived Cards: ${error.message}`) :
                console.log("Get Archived Cards: Unknown  error")
            return []
        }
    }


    public async processWebhook(webhook: TrelloWebhook) {

        // Read webhoook
        const actionType = webhook.action?.type ?? null
        const cardId = webhook.action?.data?.card?.id ?? null

        // fetch full data from updated card
        const card = await this.getCard(cardId)

        // Set up client for API requests
        const client = new LangOpsApiClient()

        
        // In our standard LangOps-Blackbird workflow, card is copied from template. We also monitor "createCard" action in case a card is created manually.
        if (actionType === "copyCard" || actionType === "createCard") {
            client.addProduct(card)

        /*
         * Applies when checkbox, title or other fields updated on card
         * The updateCard action also fires when card is archived
        */ 
        } else if (actionType === "updateCheckItemStateOnCard" || actionType === "updateCard") {
            client.editProduct(card)

        
        // Corresponds to delete (not archive) in Trello
        } else if (actionType === "deleteCard") {
            client.deleteProduct(card)
        
        } else {
            console.log("Webhook action not supported")
        }
    }  
}
