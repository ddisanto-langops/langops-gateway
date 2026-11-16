import { TrelloWebhook } from "./trello.js"

export interface LoggedWebhook {
    statusCode: string,
    data: TrelloWebhook
}