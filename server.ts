import express, { type ErrorRequestHandler } from 'express';
import router from './src/index.js'
import helmet from 'helmet'
import cors from 'cors'

const app = express()
const PORT = Number(process.env.PORT) || 3200

app.use(helmet())

app.use(cors({
  origin: "localhost"
}))

app.use(express.json())

app.use(router)

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ message });
};

app.use(errorHandler)

app.listen(PORT, () => console.log(`server running on port ${PORT} in docker`))
