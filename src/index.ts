import express, { Request, Response } from 'express'
import crypto from 'crypto'

import { TrelloAdapter } from './trello'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.text({ type: 'application/json' }))

app.post("v1/webhooks/trello", (req, res) => {
    const signature = req.headers['x-trello-webhook'] as string
    const rawBody = req.body as string

    if (!signature) {
        return res.status(400).send('Missing X-Trello-Webhook header')
    }

    const adapter = new TrelloAdapter()
    const isValid = adapter.verifyTrelloSignature(rawBody, signature)

    if (!isValid) {
        console.warn(`Unauthorized webhook attempt blocked from IP: ${req.ip}`)
        return res.status(401).send('Unauthorized: Invalid Signature')
    }

    res.sendStatus(200)

    try {
        const parsedData = JSON.parse(rawBody);
        adapter.forward(parsedData)
        

    } catch (parseError) {
        console.error('Failed to parse payload JSON after validation:', parseError);
    }
})


app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})