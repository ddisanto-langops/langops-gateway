export interface TrelloWebhook {
  action: {
    data: {
        card: {
            name: string
            id: string
        }
    }
    type: string
    date: string
  }
}

export interface RawTrelloCard {
  id: string
  name: string
  labels?: [
    {
        id: string
        name: string
    }
  ]
  due?: string | null
  dateLastActivity: string
  url: string
  isTemplate: string
  dateClosed?: string
  actions: [
    {
        data: {
            checkItem?: {
                id: string
                name: string
                state: string
            }
        }
        type: string
        date: string
    }
  ]
  attachments?: [
    {
        name: string
        url: string
    }
  ]
  customFieldItems?: [
    {
        idCustomField: string
        value: {
            checked?: string
            text?: string
        }
    }
  ]
  idLabels: string[]
}