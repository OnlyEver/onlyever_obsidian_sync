import axios from "axios";
import { Notice } from "obsidian";

class OnlyEverApi {
	apiToken: string;

	constructor(apiToken: string) {
		this.apiToken = apiToken;
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
			console.log(files.length);
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
					console.log("response", res);
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
	 * @return void
	 */
	validateApiToken() {
		try {
			const endpoint = `https://asia-south1.gcp.data.mongodb-api.com/app/onlyeverrealm-blegp/endpoint/verifyToken?pluginName=&obsidiantoken=${this.apiToken}`;
			console.log(endpoint);

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

					return;
				}

				new Notice("Invalid API Token");
			});
		} catch (err) {
			new Notice(`Failed to validate API token.`);
		}
	}
}

export { OnlyEverApi };
