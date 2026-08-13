import { RawTrelloCard, TrelloWebhook } from "../../types/trello.js"
import { FailedWebhook } from "../../types/LangOpsAPI.js"




export class LangOpsApiClient {
    /*
    *   API requires application/json to be set for request body.
    *   All methods simply return the response object and let the Adapter decide what to do next.
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


    public async addProduct(trelloCard: RawTrelloCard): Promise<Response> {

        const stringifiedBody = JSON.stringify([trelloCard]) // the add products endpoint expects an array
            const response = await fetch(`${this.basePath}/products/add`,
                {
                    method: 'POST',
                    headers: this.headers,
                    body: stringifiedBody

                }
            )
        return response
    }

    
    public async editProduct(trelloCard: RawTrelloCard): Promise<Response> {
        const id = trelloCard.id
        const stringifiedBody = JSON.stringify(trelloCard)
            const response = await fetch(`${this.basePath}/products/edit/${id}`,
                {
                    method: 'PATCH',
                    headers: this.headers,
                    body: stringifiedBody

                }
            )
        return response
    }

    // NOTE: This is the soft-delete endpoint
    public async deleteProduct(id: string): Promise<Response> {
        const response = await fetch(`${this.basePath}/products/delete/${id}`,
                {
                    method: "DELETE",
                    headers: this.headers
                }
            )
        return response
    }

    
    public async logFailedWebhook(statusCode: string, data: TrelloWebhook) {
        const failedWebhook: FailedWebhook = {
            statusCode: statusCode,
            data: data
        }
        const response = await fetch(`${this.basePath}/products/webhooks/failures`, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(failedWebhook)
        })
        return response
    }
}