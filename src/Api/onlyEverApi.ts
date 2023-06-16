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
	syncFiles(files: object[]) {
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
			new Notice(`Failed to sync ${files.length} files`);
		}
	}
}

export { OnlyEverApi };
