import crypto from 'crypto';
import type { TrelloWebhook, RawTrelloCard } from "../../types/trello"
import { langopsApiBasePath } from "../../subscribers/langopsAPI"

export class TrelloAdapter {

    private readonly callbackUrl: string
    private readonly trelloBoardId: string
    private readonly trelloSecret: string
    private readonly trelloKey: string
    private readonly trelloToken: string
    private readonly cfAccessClientId: string
    private readonly cfAccessClientSecret: string
    protected apiBasePath: string

    

    constructor() {
        this.callbackUrl = process.env.CALLBACK_URL ?? ""
        this.trelloBoardId = process.env.TRELLO_BOARD_ID ?? ""
        this.trelloSecret = process.env.TRELLO_SECRET ?? ""
        this.trelloKey = process.env.TRELLO_KEY ?? ""
        this.trelloToken = process.env.TRELLO_TOKEN ?? ""
        this.cfAccessClientId = process.env.CF_ACCESS_CLIENT_ID ?? ""
        this.cfAccessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET ?? ""

        this.apiBasePath = langopsApiBasePath

        

        if (
            !this.callbackUrl ||
            !this.trelloBoardId ||
            !this.trelloSecret ||
            !this.trelloKey ||
            !this.trelloToken
        ) {
            throw new TypeError("Cannot init Trello Adapter: missing one or more environment variables.")
        }
    }

    verifySignature(rawBody: string, signature: string): boolean | undefined {
        const content = rawBody + this.callbackUrl;
        if (this.trelloSecret) {
            const computedSignature = crypto
            .createHmac('sha1', this.trelloSecret)
            .update(content)
            .digest('base64');

        // Use timingSafeEqual to guard against timing attacks
        const compare = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(computedSignature)
        );

        return compare
        }
        
    }

    async getCard(id: string): Promise<RawTrelloCard> {
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


    async getActiveCards(since?: string): Promise<RawTrelloCard[]> {
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


    async getArchivedCards(since?: string): Promise<RawTrelloCard[]> {
        
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


    async processWebhook(webhook: TrelloWebhook) {
        const actionType = webhook.action.type
        const cardId = webhook.action.data.card.id

        const card = await this.getCard(cardId)

        const headers = new Headers()
        headers.append("Content-Type", "application/json")
        headers.append("CF-Access-Client-Id", this.cfAccessClientId)
        headers.append("CF-Access-Client-Secret", this.cfAccessClientSecret)

        const stringifiedBody = JSON.stringify(body)

        if (actionType === "createCard") {
            const response = await fetch(`${this.apiBasePath}/products/add`,
                {
                    method: 'POST',
                    headers: headers,
                    body: stringifiedBody

                }
            )
            if (!response.ok) {
                const message = await response.text()
                throw new Error(`HTTP ${response.status}: ${message}`)
            }
        } else if (actionType === "updateCheckItemStateOnCard") {
            const response = await fetch(`${this.apiBasePath}/products/edit/${cardId}`,
                {
                    method: 'PATCH',
                    headers: headers,
                    body: stringifiedBody

                }
            )
            if (!response.ok) {
                const message = await response.text()
                throw new Error(`HTTP ${response.status}: ${message}`)
            }
        }

    }






    
}