const Muffin = require("../index.js");

(async () => {
    const client = new Muffin.Client({
        url: "mongodb+srv://cookie3:nKlcVr4tSlgXaALi@cookiedb-yge5g.gcp.mongodb.net/muffin?retryWrites=true&w=majority"
    });
    await client.defer;
    const hi = client.piece("hi", true);
    const hi2 = client.piece("hi");

    console.log(await hi.set("issou", "yolo"));
    console.log(await hi.get("issou"));
    console.log(hi, hi2);
})();
