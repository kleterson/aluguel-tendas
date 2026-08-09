const express = require('express');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-517824253559090-073117-47dad5ef4352fb0abd9e5d717275dfa3-71867761' 
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

app.post('/api/pagamento', async (req, res) => {
    try {
        const { transaction_amount, description, payer, address } = req.body;
        const payment = new Payment(client);

        const body = {
            transaction_amount: Number(transaction_amount),
            description: description,
            payment_method_id: 'pix',
            payer: {
                email: payer.email,
                first_name: payer.name.split(' ')[0],
                last_name: payer.name.split(' ').slice(1).join(' ') || 'Cliente',
                identification: {
                    type: 'CPF',
                    number: payer.cpf
                },
                address: {
                    street_name: address.street,
                    street_number: String(address.number),
                    zip_code: address.cep.replace(/\D/g, '')
                }
            }
        };

        const response = await payment.create({ body });
        res.status(200).json(response);
    } catch (error) {
        console.error("Erro detalhado do Mercado Pago:", error.api_response?.status ? error.api_response : error);
        res.status(500).json({ error: error.message || "Erro interno no servidor" });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});