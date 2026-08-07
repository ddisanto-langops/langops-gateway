import { RawTrelloCard } from "./trello.js"

export interface FailedWebhook {
    operation: string,
    data: RawTrelloCard
}