import express from 'express';
import { HOST, PORT } from '../../config';

const app = express();

app.listen(PORT, HOST, () => {
    console.log(`Listening on http://${HOST}:${PORT}/`);
});