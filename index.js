const Client = require("./src/MuffinClient");

module.exports = {
    Client
};

var test = new Client({
    url: "mongodb+srv://Coucou:mbGzUKhNMkzgqhvF@cookiedb-yge5g.gcp.mongodb.net/test?retryWrites=true&w=majority",
    dbName: "issou"
});

(async () => {
    await test.init();

    console.log("Le muffin est prêt");
    const { coucou, bite } = test.multi(["coucou", "bite"]);
    console.log(coucou, bite);
})();
