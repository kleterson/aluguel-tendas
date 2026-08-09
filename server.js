const express = require('express');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

let pedidosClientes = [];

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'APP_USR-517824253559090-073117-47dad5ef4352fb0abd9e5d717275dfa3-71867761' 
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

app.post('/api/pagamento', async (req, res) => {
    try {
        const { transaction_amount, description, payer, address, payment_method_id, cardData } = req.body;
        const payment = new Payment(client);

        const metodoPagamento = payment_method_id || 'pix';

        const body = {
            transaction_amount: Number(transaction_amount),
            description: description,
            payment_method_id: metodoPagamento,
            payer: {
                email: payer.email,
                first_name: payer.name.split(' ')[0],
                last_name: payer.name.split(' ').slice(1).join(' ') || 'Cliente',
                identification: {
                    type: 'CPF',
                    number: payer.cpf.replace(/\D/g, '')
                },
                address: {
                    street_name: address.street,
                    street_number: String(address.number),
                    zip_code: address.cep.replace(/\D/g, '')
                }
            }
        };

        // Configuração caso o pagamento seja por cartão de crédito direto
        if (metodoPagamento === 'credit_card' && cardData) {
            body.token = cardData.token; // Caso utilize tokenização via SDK do MP
            body.installments = Number(cardData.installments) || 1;
            
            // Se os dados do cartão vierem diretamente digitados sem token do SDK:
            if (!cardData.token && cardData.number) {
                body.card = {
                    number: cardData.number,
                    expiration_month: cardData.expiration_month,
                    expiration_year: cardData.expiration_year,
                    security_code: cardData.security_code,
                    cardholder: cardData.cardholder
                };
            }
        }

        const idempotencyKey = crypto.randomUUID();

        const response = await payment.create({ 
            body, 
            requestOptions: { idempotencyKey } 
        });

        // Salva imediatamente como pendente para o admin após gerar a tentativa de pagamento
        const novoPedido = {
            id: Date.now(),
            paymentId: response.id,
            payer,
            address,
            transaction_amount: Number(transaction_amount),
            description,
            payment_method_id: metodoPagamento,
            statusAdmin: 'pendente_pagamento',
            dataHorarioEnvio: '',
            mensagemAgradecimento: '',
            data: new Date().toLocaleString('pt-BR')
        };
        pedidosClientes.push(novoPedido);

        res.status(200).json(response);
    } catch (error) {
        console.error("ERRO DETALHADO DO MERCADO PAGO:", error.api_response?.status ? error.api_response : error);
        res.status(500).json({ error: error.message || "Erro interno no servidor" });
    }
});

// Rota para verificar status do pagamento
app.post('/api/verificar-pagamento', async (req, res) => {
    try {
        const { paymentId } = req.body;
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: paymentId });

        const pedido = pedidosClientes.find(p => p.paymentId == paymentId);
        if (pedido && paymentInfo.status === 'approved') {
            pedido.statusAdmin = 'aprovado';
        }

        res.status(200).json({ status: paymentInfo.status });
    } catch (error) {
        res.status(500).json({ error: "Erro ao verificar pagamento" });
    }
});

app.get('/api/pedidos', (req, res) => {
    res.json(pedidosClientes);
});

app.post('/api/pedidos/:id/atualizar', (req, res) => {
    const { id } = req.params;
    const { dataHorarioEnvio, mensagemAgradecimento } = req.body;

    const pedido = pedidosClientes.find(p => p.id == id);
    if (pedido) {
        pedido.statusAdmin = 'visualizado';
        pedido.dataHorarioEnvio = dataHorarioEnvio;
        pedido.mensagemAgradecimento = mensagemAgradecimento;
        return res.status(200).json({ success: true });
    }
    res.status(404).json({ error: 'Pedido não encontrado' });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});