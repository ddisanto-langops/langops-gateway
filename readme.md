# LangOps Gateway
The LangOps Gateway handles contracts between third parties and internal tools such as APIs. It validates webhooks and calls upstream services.

## Key Concepts
- **Route**: An exposed endpoint (in this case, using Express.js) which receives webhooks.
- **Adapter**: Class that is called when a webhook is received; handles validation, data enrichment, and decides which subscriber methods to call
- **Subscriber**: Class that defines the contract between the "adapter" and an upstream service, e.g. an API, by exposing methods to the adapter

## Environment Variables
**The following variables must be set:**  
`PORT`: Port to expose  
*Trello*  
`TRELLO_BOARD_ID`: Defines the board to fetch data from  
`TRELLO_KEY`: Required for authentication  
`TRELLO_TOKEN`: Required for authentication  
`TRELLO_SECRET`: Required for authentication  
`TRELLO_CALLBACK_URL`: Required for webhook signature verification  
*LangOps API*
`BASEPATH`: Where to find the API  
`CF_ACCESS_CLIENT_ID`: Required for API authentication  
`CF_ACCESS_CLIENT_SECRET`: Required for API authentication

## Example Workflow (Trello -> LangOps API)
1) A webook is received from Trello
2) The Trello card ID and action type are extracted from the webhook
3) The Trello adapter fetches more data and decides what upstream service and methods to call  