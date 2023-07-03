import axios from "axios";
import { Notice, App } from "obsidian";
// const plugin = require('../../main');

class OnlyEverApi {
	app: App;
	apiToken: string;
	permanentToken: string;

	constructor(apiToken: string, permanentToken: string) {
		this.app = app;
		this.apiToken = apiToken;
		this.permanentToken = permanentToken;
	}

	/**
	 * Syncs Multiple file with only ever atlas
	 *
	 * @param files
	 *
	 * @return void
	 */
	async syncFiles(files: object[]) {
		try {
			const endpoint = `https://asia-south1.gcp.data.mongodb-api.com/app/onlyeverrealm-blegp/endpoint/notes?pluginName=obsidian&token=${this.apiToken}`;
			let fileId;
			if (files.length > 0) {
				return axios({
					method: "post",
					url: endpoint,
					headers: {
						"Content-Type": "application/json",
					},
					data: files,
				}).then((res: object) => {
					new Notice(`Synced ${files.length} file(s)`);
					return res?.data?.data.fileId;
				});
			}

			return fileId;
		} catch (err) {
			new Notice(`Failed to sync ${files.length} files`);
		}
	}

	/**
	 * Validate api token
	 *
	 * @return ?string
	 */
	async validateApiToken() {
		try {
			const endpoint = `https://asia-south1.gcp.data.mongodb-api.com/app/onlyeverrealm-blegp/endpoint/verifyToken?pluginName=obsidian&token=${this.apiToken}`;

			return axios({
				method: "post",
				url: endpoint,
				headers: {
					"Content-Type": "application/json",
				},
				data: {
					pluginName: "obsidian",
					token: `${this.apiToken}`,
				},
			}).then((res: object) => {
				if (res?.data?.success) {
					new Notice("Valid API Token");

					return res?.data?.identifier;
				}

				new Notice("Invalid API Token");
			});
		} catch (err) {
			console.log(err.message);
			new Notice(`Failed to validate API token.`);
		}
	}
}

export { OnlyEverApi };
