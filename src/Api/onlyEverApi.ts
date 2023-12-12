import axios from "axios";
import { App } from "obsidian";
import {OeToast} from "../OeToast";

interface ApiData {
	success: boolean;
	data: object;
	fileToken: string;
}

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
			const endpoint = `https://us-east-1.aws.data.mongodb-api.com/app/oe-phase1-tkmsy/endpoint/notes?pluginName=obsidian&token=${this.apiToken}`;

			if (files.length > 0) {
				axios({
					method: "post",
					url: endpoint,
					headers: {
						"Content-Type": "application/json",
					},
					data: files,
				})
					.then((res) => {
						if ((res?.data as ApiData).success) {
							new OeToast(`Synced file successfully.`);
						} else {
							new OeToast("Notes sync failed. Please ensure you have correct plugin token in the settings.");
						}
					})
					.catch((err) => {
						let errorMessage =
							"Notes sync failed. Please ensure you have correct plugin token in the settings.";

						if (err["code"] === "ERR_NETWORK") {
							errorMessage =
								"Notes sync failed. Please ensure you have internet connection.";
						}

						new OeToast(errorMessage);
					});
			}
		} catch (err) {
			new OeToast(`Failed to sync file`);
		}
	}

	/**
	 * Validate api token
	 *
	 * @return ?string
	 */
	async validateApiToken(token: string) {
		try {
			const endpoint = `https://us-east-1.aws.data.mongodb-api.com/app/oe-phase1-tkmsy/endpoint/verifyToken?pluginName=obsidian&token=${token}`;
			return axios({
				method: "post",
				url: endpoint,
				headers: {
					"Content-Type": "application/json",
				},
			})
				.then((res) => {
					if ((res?.data as ApiData)?.success) {
						return {'status':true};
					}

					return {'status':true};
				})
				.catch((err) => {
					if (err["code"] === "ERR_NETWORK") {
						new OeToast(
							"Token verification failed. Please ensure you have internet connection."
						);

						return {'status':false};
					}

					return {'status':false};
				});
		} catch (err) {
			return {'status':false}
		}
	}

	/**
	 * Sync file images
	 *
	 * @param data
	 *
	 * @returns
	 */
	async syncImages(data:object){
		try {
			const endpoint = `https://us-east-1.aws.data.mongodb-api.com/app/oe-phase1-tkmsy/endpoint/syncImages?pluginName=obsidian&token=${this.apiToken}`;

			return axios({
					method: "post",
					url: endpoint,
					headers: {
						"Content-Type": "application/json",
					},
					data: data,
				}).then((res) => {
					if ((res?.data as ApiData).success) {
						new OeToast(`Synced file successfully`);

						return res.data.filePath;
					} else {
						new OeToast(
							"Notes sync failed. Please ensure you have correct plugin token in the settings."
						);
					}

					return;
				}).catch((err)=>{
					new OeToast('Unable to sync file images');
				})
		}catch (e){
			new OeToast('Syncing image failed');
		}
	}
}

export { OnlyEverApi };
