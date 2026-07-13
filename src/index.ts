import { Router } from 'express'
import { TrelloAdapter } from './adapters/trelloAdapter.js'
import { TrelloWebhook } from '../types/trello.js'



const router = Router()

router.head("/webhooks/trello", (req, res) => {
    return res.sendStatus(200)
})

router.post("/webhooks/trello", async (req, res) => {
    const signature = req.headers['x-trello-webhook'] as string
    const rawWebHook = req.body as TrelloWebhook
    
    if (!signature) {
        return res.status(400).send('Missing X-Trello-Webhook header')
    }

    const adapter = new TrelloAdapter()
    const isValid = adapter.verifySignature(JSON.stringify(rawWebHook), signature)

    if (!isValid) {
        console.warn(`Unauthorized webhook attempt blocked from IP: ${req.ip}`)
        return res.status(401).send('Unauthorized: invalid signature')
    }
    
    console.log(`Received valid webhook. IP: ${req.ip} | Status: ${req.statusCode} | Contents: ${req.body}`)
    try {
        await adapter.processWebhook(rawWebHook)

    } catch (parseError) {
        console.log('Failed to parse payload JSON after validation:', parseError);
    }
    res.sendStatus(200)
})


export default router