import { TrelloWebhook } from "./trello.js"

export interface FailedWebhook {
    statusCode: string,
    data: TrelloWebhook
}