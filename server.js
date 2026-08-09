const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Servir os arquivos estáticos da pasta
app.use(express.static(path.join(__dirname)));

// Rota para gerar o Pix no Mercado Pago usando seu Token
app.post('/api/pagamento', async (req, res) => {
    const { transaction_amount, description } = req.body;
    const MP_TOKEN = "APP_USR-517824253559090-073117-47dad5ef4352fb0abd9e5d717275dfa3-71867761";

    try {
        const response = await axios.post('https://api.mercadopago.com/v1/payments', {
            transaction_amount: Number(transaction_amount),
            description: description || "Aluguel de Tendas e Som",
            payment_method_id: "pix",
            payer: {
                email: "cliente@eventlux.com"
            }
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${MP_TOKEN}`
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error("Erro no Mercado Pago:", error.response?.data || error.message);
        res.status(500).json({ error: "Erro ao gerar pagamento Pix", details: error.response?.data });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});