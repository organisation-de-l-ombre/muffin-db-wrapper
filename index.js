module.exports = {
	Client: require("./lib/MuffinClient.js"),
	Piece: require("./lib/Piece.js"),
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	version: require("./package.json").version,
};
