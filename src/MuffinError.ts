export default class MuffinError extends Error {
	constructor(public message: string, public name = "MuffinError") {
		super();
		Error.captureStackTrace(this, this.constructor);
	}
}
