import {Notice} from "obsidian";

export class OeToast {
	message: string

	constructor(message: string) {
		this.message = message

		new Notice(message, this.calculateToastDuration(message))
	}

	calculateToastDuration(message: string) {
		const messageLength = message.length;
	
		if (messageLength <= 20) {
			return 3000;
		} else if (messageLength <= 50) {
			return 4000;
		} else if (messageLength <= 80) {
			return 4500;
		} else {
			return 5500;
		}
	}

}
