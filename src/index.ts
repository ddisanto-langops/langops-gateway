import { Router } from 'express'
import { TrelloAdapter } from './adapters/trelloAdapter'
import { TrelloWebhook } from '../types/trello'



const router = Router()

router.head("/", (req, res) => {
    return res.sendStatus(200)
})

router.post("/webhooks/trello", async (req, res) => {
    const signature = req.headers['x-trello-webhook'] as string
    const rawBody = req.body as TrelloWebhook
    /*
    if (!signature) {
        return res.status(400).send('Missing X-Trello-Webhook header')
    }

    const adapter = new TrelloAdapter()
    const isValid = adapter.verifySignature(rawBody, signature)

    if (!isValid) {
        console.warn(`Unauthorized webhook attempt blocked from IP: ${req.ip}`)
        return res.status(401).send('Unauthorized: invalid signature')
    }
    */
    res.sendStatus(200)
    const adapter = new TrelloAdapter()
    try {
        const filtered = adapter.processWebhook(rawBody)
        console.log(filtered)
        

    } catch (parseError) {
        console.error('Failed to parse payload JSON after validation:', parseError);
    }
})


export default router