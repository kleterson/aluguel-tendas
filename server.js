const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Servir os arquivos estáticos da pasta
app.use(express.static(path.join(__dirname)));

// Rota para gerar o Pix no Mercado Pago com dados do cliente e endereço
app.post('/api/pagamento', async (req, res) => {
    const { transaction_amount, description, payer, address } = req.body;
    const MP_TOKEN = "APP_USR-517824253559090-073117-47dad5ef4352fb0abd9e5d717275dfa3-71867761";

    try {
        const paymentData = {
            transaction_amount: Number(transaction_amount),
            description: description || "Aluguel de Tendas e Som",
            payment_method_id: "pix",
            payer: {
                email: payer?.email || "cliente@eventlux.com",
                first_name: payer?.name ? payer.name.split(' ')[0] : "Cliente",
                last_name: payer?.name ? payer.name.split(' ').slice(1).join(' ') || "EventLux" : "EventLux",
                identification: {
                    type: "CPF",
                    // Usa o CPF enviado ou um padrão de teste válido se não preenchido
                    number: payer?.cpf ? payer.cpf.replace(/\D/g, '') : "19119119119"
                },
                address: {
                    street_name: address?.street || "Rua do Evento",
                    street_number: address?.number || "123",
                    zip_code: address?.cep ? address.cep.replace(/\D/g, '') : "01001000"
                }
            }
        };

        const response = await axios.post('https://api.mercadopago.com/v1/payments', paymentData, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${MP_TOKEN}`
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error("ERRO DETALHADO DO MERCADO PAGO:", JSON.stringify(error.response?.data, null, 2));
        res.status(500).json({ error: "Erro ao gerar pagamento Pix", details: error.response?.data });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});