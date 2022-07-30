export default class Game {
    constructor(Schema, model, {collection}={}) {
        this.#schema = new Schema({
            id: {type: String, required: true, unique: true, index: true},
            questions: [{
                question: {type: String, required: true},
                answer: {type: String, required: true},
            }],
            users: [{type: String, required: true}],
            answers: [{
                user: {type: String, required: true},
                answer: {type: String, required: true},
            }],
            created: { type: Date, default: Date.now },
        });
        this.#model = model('Game', this.#schema, collection);
    }
    #schema;
    #model;
}