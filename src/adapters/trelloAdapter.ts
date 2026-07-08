import crypto from 'crypto';
import type { TrelloWebhook, RawTrelloCard } from "../../types/trello"

export class TrelloAdapter {

    private readonly callbackUrl: string
    private readonly trelloBoardId: string
    private readonly trelloSecret: string
    private readonly trelloKey: string
    private readonly trelloToken: string
    private readonly forwardTargetUrl: string

    

    constructor() {
        this.callbackUrl = process.env.CALLBACK_URL ?? ""
        this.trelloBoardId = process.env.TRELLO_BOARD_ID ?? ""
        this.trelloSecret = process.env.TRELLO_SECRET ?? ""
        this.trelloKey = process.env.TRELLO_KEY ?? ""
        this.trelloToken = process.env.TRELLO_TOKEN ?? ""
        this.forwardTargetUrl = process.env.FORWARD_TARGET_URL ?? ""

        if (
            !this.callbackUrl ||
            !this.trelloBoardId ||
            !this.trelloSecret ||
            !this.trelloKey ||
            !this.trelloToken ||
            !this.forwardTargetUrl
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
            `https://api.trello.com/1/cards/${id}?key=${this.TRELLO_KEY}&token=${this.TRELLO_TOKEN}&fields=name,dateLastActivity,due,url,dateClosed&actions=all&attachments=true&attachment_fields=all&customFieldItems=true`, {
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


    processWebhook(body: TrelloWebhook) {
        const actionType = body.action.type
        const actionDate = body.action.date
        const cardId = body.action.data.card.id
        const cardName = body.action.data.card.name

        return {
            actionType: actionType,
            actionDate: actionDate,
            cardId: cardId,
            cardName: cardName
        }
    }






    forward(data: any) {
        /**
         * @param data: the parsed JSON data to forward
         */
        if (this.FORWARD_TARGET_URL) {
            fetch(this.FORWARD_TARGET_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(err => console.error(`Failed forwarding payload downstream:`, err.message));
        }
        

    }
}