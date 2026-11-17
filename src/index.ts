import { Router } from 'express'
import { TrelloAdapter } from './adapters/trelloAdapter.js'
import { TrelloWebhook } from '../types/trello.js'



const router = Router()

router.head("/webhooks/trello", (req, res) => {
    return res.sendStatus(200)
})

router.post("/webhooks/trello", async (req, res) => {
    const dateFormat = new Intl.DateTimeFormat("sv-SE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    })
    const timestamp = dateFormat.format(new Date())
    const clientIp = req.ip?.replace(/^::ffff:/, '')
    const signature = req.headers['x-trello-webhook'] as string
    const rawWebHook = req.body as TrelloWebhook
    
    if (!signature) {
        return res.status(400).send('Missing X-Trello-Webhook header')
    }

    const adapter = new TrelloAdapter()
    const isValid = adapter.verifySignature(JSON.stringify(rawWebHook), signature)

    if (!isValid) {
        console.warn(`\nUnauthorized request blocked from IP: ${clientIp}`)
        return res.status(401).send('Unauthorized: invalid signature')
    }
    
    console.log(`\nReceived ${req.method} request at ${timestamp} from ${clientIp} | Response status: ${res.statusCode}`)
    try {
        await adapter.processWebhook(rawWebHook)

    } catch (parseError) {
        console.log('\nFailed to parse webhook JSON after validation:', parseError);
    }
    res.sendStatus(200)
})


export default router