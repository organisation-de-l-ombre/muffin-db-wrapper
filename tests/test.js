const Muffin = require("../index.js");

(async () => {
    const client = new Muffin.Client({
        url: "mongodb+srv://cookie3:nKlcVr4tSlgXaALi@cookiedb-yge5g.gcp.mongodb.net/muffin?retryWrites=true&w=majority"
    });
    await client.defer;
    const hi = client.piece("hi", { cache: true, fetchAll: false });

    console.log(hi.cache);

    setTimeout(async () => {
        await hi.push("testarray", "yolo");
        console.log(hi.cache);

        await hi.push("testarray", "yolo");
        console.log(hi.cache);

        // console.log(await hi.get("testarray"), await hi.rawArray(true));

        // await hi.delete("testarray", "tg");

        // console.log(await hi.get("testarray"));
    }, 3000);
})();
