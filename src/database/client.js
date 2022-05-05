import { MongoClient } from "mongodb";

export default class Client {
    constructor({host, port, dbName, username, password}) {
        this.#host = host;
        this.#port = port;
        this.#dbName = dbName;
        this.#username = username;
        this.#password = password;
    }
    #dbName;
    #username;
    #password;
    #host;
    #port;
    #client;
    #db;

    async connect() {
        const uri = this.#username && this.#password
            ? `mongodb://${this.#username}:${this.#password}@${this.#host}:${this.#port}`
            : `mongodb://${this.#host}:${this.#port}`;
        const client = await MongoClient.connect(uri, { useNewUrlParser: true });
        this.#client = client;
        this.#db = client.db(this.#dbName);
    }

    async find(collectionName, query) {
        const collection = this.#db.collection(collectionName);
        return collection.find(query).toArray();
    }

    async insert(collectionName, data) {
        const collection = this.#db.collection(collectionName);
        return collection.insertOne(data);
    }

    async update(collectionName, query, data) {
        const collection = this.#db.collection(collectionName);
        return collection.updateOne(query, data);
    }

    async delete(collectionName, query) {
        const collection = this.#db.collection(collectionName);
        return collection.deleteOne(query);
    }

    async close() {
        await this.#client.close();
    }

}