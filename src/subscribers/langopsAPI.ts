import type { RawTrelloCard } from "../../types/trello.js"



export class LangOpsApiClient {
    /*
    *   API requires application/json to be set for request body.
    *   All methods simply return the response's status code, and let the Adapter decide what to do next.
    */

    readonly basePath: string
    private readonly cfAccessClientId: string
    private readonly cfAccessClientSecret: string
    private readonly headers: Headers

    constructor() {
        this.cfAccessClientId = process.env.CF_ACCESS_CLIENT_ID ?? ""
        this.cfAccessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET ?? ""
        this.basePath = "https://api.pcglangops.com/api/v1"

        if (
            !this.cfAccessClientId ||
            !this.cfAccessClientSecret ||
            !this.basePath
        ) {
            throw new Error("Unable to init LangOps API client: missing one or more env variables")
        }

        this.headers = new Headers()
        this.headers.append("Content-Type", "application/json")
        this.headers.append("CF-Access-Client-Id", this.cfAccessClientId)
        this.headers.append("CF-Access-Client-Secret", this.cfAccessClientSecret)
    }


    public async addProduct(trelloCard: RawTrelloCard): Promise<number> {

        const stringifiedBody = JSON.stringify([trelloCard]) // the add products endpoint expects an array
            const response = await fetch(`${this.basePath}/products/add`,
                {
                    method: 'POST',
                    headers: this.headers,
                    body: stringifiedBody

                }
            )
        return response.status
    }

    
    public async editProduct(trelloCard: RawTrelloCard) {
        const id = trelloCard.id
        const stringifiedBody = JSON.stringify(trelloCard)
            const response = await fetch(`${this.basePath}/products/edit/${id}`,
                {
                    method: 'PATCH',
                    headers: this.headers,
                    body: stringifiedBody

                }
            )
        return response.status
    }

    // NOTE: This is the soft-delete endpoint
    public async deleteProduct(trelloCard: RawTrelloCard) {
        const id = trelloCard.id
        const response = await fetch(`${this.basePath}/products/delete/${id}`,
                {
                    method: "DELETE",
                    headers: this.headers
                }
            )
        return response.status
    }   
}