export default class CustomError extends Error {
	constructor(public message: string, public name = "MuffinError") {
		super();
		Error.captureStackTrace(this, this.constructor);
	}
}
