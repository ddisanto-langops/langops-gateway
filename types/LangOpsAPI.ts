import { TrelloWebhook } from "./trello.js"

export interface FailedWebhook {
    operation: string,
    data: TrelloWebhook
}