const Muffin = require("../index.js");

(async () => {
    const client = new Muffin.Client({
        url: "mongodb+srv://cookie3:nKlcVr4tSlgXaALi@cookiedb-yge5g.gcp.mongodb.net/muffin?retryWrites=true&w=majority"
    });
    await client.defer;
    const hi = client.piece("hi", { cache: true, fetchAll: true });

    console.log(hi.cache);

    setTimeout(async () => {
        await hi.push("testarray", "yolo", null, true).then(() => console.log(hi.cache));

        await hi.push("testarray", "yolo", null, true).then(() => console.log(hi.cache));

        hi.evictAll();
        console.log(await hi.valueArray());

        await hi.clear();
        // console.log(await hi.get("testarray"), await hi.rawArray(true));

        // await hi.delete("testarray", "tg");

        // console.log(await hi.get("testarray"));
    }, 2000);
})();
