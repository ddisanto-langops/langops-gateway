# LangOps Gateway
This is the LangOps Gateway server app. It is meant as a centralized location where data intended for LangOps products is fetched from third party sources, then fed to the LangOps API (or other subscribers) as JSON.

## Scopes
The LangOps Gateway handles several data contracts:
- Reception of webhooks from third parties, and their validation
- Subsequent fetching of more data from third parties, based on domain logic
- Transfer of that data to a subscriber, e.g. API

## Example Workflow (Trello -> LangOps API)
1) A webook is received from Trello
2) The Trello card ID and action type are extracted from the webhook
3) A function is called to fetch the entire card
4) The JSON of the card is sent to the appropriate subscriber endpoint

## Key Concepts
- **Route**: An exposed endpoint (in this case, using Express.js) which third-party data (i.e. webhooks) can be sent to. Some webhook services require validation at time of creation, so a HEAD route is provided. 
- **Adapter**: Class that handles reception or fetching of third-party data (e.g. Trello cards) via class methods
- **Subscriber**: Class that handles transfer of the adapter's data to another service, e.g. the LangOps ApI