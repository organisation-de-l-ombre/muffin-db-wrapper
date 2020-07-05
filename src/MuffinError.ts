export default class MuffinError extends Error {
	constructor(message: string, name?: string) {
		super();
		Error.captureStackTrace(this, this.constructor);
		this.name = name || "MuffinError";
		this.message = message;
	}
}
