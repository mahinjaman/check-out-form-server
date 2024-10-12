const express = require('express')
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.port || 3000;

// middleware for

app.use(express.json())
app.use(cors({
    credentials: true,
    origin: ['http://localhost:5173', 'http://localhost:5174'],

}))

app.use(express.urlencoded())




app.get('/', async (req, res) => {
    res.send('Hello, SSL Bashi')
})



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: axios } = require('axios');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oqwbmox.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb://127.0.0.1:27017/SSL_commerz`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {

    const PaymentCollections = client.db('SSL_COMMERZ').collection('payments');


    try {
        await client.connect();

        const transitionId = new ObjectId().toString();

        app.post('/payment-intent', async (req, res) => {
            const paymentInfo = req.body;
            const paymentIntent = {
                store_id: process.env.SSL_STORE_ID,
                store_passwd: process.env.SSL_SECRET_KEY,
                product_name: 'Anda',
                product_category: 'Egg',
                product_profile: 'Anda',
                total_amount: "100",
                currency: "EUR",
                tran_id: transitionId,
                success_url: "http://localhost:3000/payment-success",
                fail_url: "http://localhost:3000/payment-fail",
                cancel_url: "http://localhost:3000/payment-cancel",
                cus_name: paymentInfo?.name,
                cus_email: paymentInfo?.email,
                cus_add1: paymentInfo?.address,
                cus_city: paymentInfo?.address,
                cus_postcode: "1000",
                cus_country: "Bangladesh",
                cus_phone: paymentInfo?.phone_no,
                cus_fax: paymentInfo?.phone_no,
                ship_name: paymentInfo?.name,
                ship_postcode: "1000",
                shipping_method:'NO',
                ship_country: "Bangladesh",
                multi_card_name: "mastercard,visacard,amexcard",
            }

            const response = await axios.post('https://sandbox.sslcommerz.com/gwprocess/v4/api.php', paymentIntent , {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            });

            const saveData = {
                transitionId,
                cus_name: paymentInfo?.name,
                cus_email: paymentInfo?.email,
                cus_add: paymentInfo?.address,
                status : 'Pending'
            }

            const saveDataToDB = await PaymentCollections.insertOne(saveData);
            const paymentURL = response?.data?.GatewayPageURL;
            
            res.send({paymentURL})
        });

        app.post('/payment-success', async (req, res)=>{
            const paymentInfo = req.body;
            if(paymentInfo.status !== 'VALID'){
                return res.status(401).send({message: 'Payment Failed'})
            }
            
            const query = {transitionId: paymentInfo.tran_id};
            const option = {
                $upsert: true,
            }
            const updateStatus = {
                $set: {
                    status: 'SUCCESS',
                    paymentDate: paymentInfo.tran_date,
                    currency: paymentInfo.currency,
                    amount: paymentInfo.currency_amount
                }
            }

            const updateStatusResult = PaymentCollections.updateOne(query, updateStatus, option);
            res.send({paymentInfo: paymentInfo.status})
        })

        app.post('/payment-cancel', async (req, res)=>{
            const paymentInfo = req.body;

            const query = {transitionId: paymentInfo.tran_id};
            const option = {
                $upsert: true,
            }
            
            const updateStatus = {
                $set: {
                    status: 'CANCEL',
                    paymentDate: paymentInfo.tran_date,
                    currency: paymentInfo.currency,
                    amount: paymentInfo.currency_amount
                }
            }

            const updateStatusResult = PaymentCollections.updateOne(query, updateStatus, option);
            res.send({paymentInfo: paymentInfo.status})
        })

        app.post('/payment-fail', async (req, res)=>{
            const paymentInfo = req.body;

            const query = {transitionId: paymentInfo.tran_id};
            const option = {
                $upsert: true,
            }
            
            const updateStatus = {
                $set: {
                    status: 'FAIL',
                    paymentDate: paymentInfo.tran_date,
                    currency: paymentInfo.currency,
                    amount: paymentInfo.currency_amount
                }
            }

            const updateStatusResult = PaymentCollections.updateOne(query, updateStatus, option);
            res.send({paymentInfo: paymentInfo.status})
        })


        


        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);




app.listen(port, () => {
    console.log('listening on port ' + port);

})



