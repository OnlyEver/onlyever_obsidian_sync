import axios from "axios";

class OnlyEverApi {
	apiToken: string;

	constructor(apiToken: string) {
		this.apiToken = apiToken;
	}

	/**
	 * Syncs Multiple file with only ever atlas
	 *
	 *
	 */
	syncFile(files: object) {
		try {
			const endpoint = `https://asia-south1.gcp.data.mongodb-api.com/app/onlyeverrealm-blegp/endpoint/notes?pluginName=obsidian&token=${this.apiToken}`;

			axios({
				method: "post",
				url: endpoint,
				headers: {
					"Content-Type": "application/json",
				},
				data: files,
			}).then((res: object) => {
				console.log(res);
			});
		} catch (err) {
			console.log(err);
		}
	}
}

export { OnlyEverApi };
