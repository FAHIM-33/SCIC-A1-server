require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(express.json())
app.use(cors())



const uri = `mongodb+srv://${process.env.USR_NAME}:${process.env.PASS}@cluster0.4pbmvpd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const booksCollection = client.db('LibraryDB').collection('BooksCollection')
const borrowedCollection = client.db('LibraryDB').collection('Borrowed')

async function run() {
    try {
        client.connect()
        app.get('/api/v1/all-books', async (req, res) => {
            const category = req?.query?.category
            const available = req?.query?.available

            const filter = {}
            if (category) {
                filter.category = category
            }
            if (available) {
                filter.qty = { $gt: 0 }
            }
            const result = await booksCollection.find(filter).toArray()

            res.send(result)

        })

        app.get('/api/v1/book/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await booksCollection.findOne(filter)
            res.send(result)
        })

        //----------------------------------BORROW APIs-----------------------------------
        // Get borrowed books
        app.get('/api/v1/borrowed', async (req, res) => {
            const userEmail = req.query.email
            let filter = {}
            if (userEmail) {
                filter.email = userEmail
            }

            let result = await borrowedCollection.find(filter).toArray()
            res.send(result)
        })

        app.get('/api/v1/Abook/:productID', async (req, res) => {
            const { productID } = req.params
            const filter = { _id: new ObjectId(productID) }

            const removerFilter = { productID: productID }
            const result = await booksCollection.findOne(filter)

            // IF a borrowed book is deleted from DB of library, this will delete from borrowed collection as well.
            if (!result) {
                let deleted = await borrowedCollection.deleteOne(removerFilter)
            }

            res.send(result)
        })

        // Boorrow a book
        app.post('/api/v1/borrow-book', async (req, res) => {
            const data = req.body


            // Search if the bookd is already borrowed
            let filter = { productID: data.productID }
            let isBorrowed = await borrowedCollection.findOne(filter)
            let theBook = await booksCollection.findOne({ _id: new ObjectId(data.productID) })
            if (isBorrowed) {
                return res.send({ exists: true })
            }

            if (theBook.qty == 0) {
                return res.send({ available: false })
            }

            // If not borrowed, insert and send result.
            let result = await borrowedCollection.insertOne(data)
            res.send(result)
        })

        // update QTY Borrow$Return
        app.patch('/api/v1/update-quantity', async (req, res) => {
            const operation = req.query.operation
            const data = req.body
            let quantity = data.qty
            if (operation === 'decrease') { quantity -= 1 }
            if (operation === 'increase') { quantity += 1 }
            let obj = {}
            obj.qty = quantity
            let filter = { _id: new ObjectId(data.productID) }
            let document = {
                $set: obj
            }
            const result = await booksCollection.updateOne(filter, document)
            res.send(result)
        })

        app.delete('/api/v1/return-borrowed/:id', async (req, res) => {
            const id = req.params.id
            let filter = {
                _id: new ObjectId(id)
            }
            let result = await borrowedCollection.deleteOne(filter)
            res.send(result)
        })


        // Add Book (admin only)
        app.post('/api/v1/addBook', async (req, res) => {
            const book = req.body
            // const currentUser = req?.query?.email
            // const tokenUser = req?.TokenUserEmail

            // if (currentUser !== tokenUser) { return res.status(200).send({ message: "Forbidden Access" }) }

            let result = await booksCollection.insertOne(book)
            res.send(result)
        })

        //Update a book 
        app.put('/app/v1/update/:id', async (req, res) => {
            let id = req.params.id
            let data = req.body
            let filter = {
                _id: new ObjectId(id)
            }
            let newBook = {
                $set: {
                    name: data.name,
                    rating: data.rating,
                    qty: data.qty,
                    authorName: data.authorName,
                    img: data.img,
                    category: data.category
                }
            }
            let option = { upsert: true }
            let result = await booksCollection.updateOne(filter, newBook, option)
            res.send(result)
        })


        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);



app.get('/', async (req, res) => {
    res.send("Library server v2 running")
})

app.listen(port, () => {
    console.log(`running`)
})