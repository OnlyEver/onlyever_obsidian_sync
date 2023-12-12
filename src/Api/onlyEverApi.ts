import axios, {AxiosResponse} from "axios";
import {OeToast} from "../OeToast";
import {MarkdownAndImageInputPayloadMap, MarkdownAndRemoteUrlMap} from "../interfaces";

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
							new OeToast(res.data.message);
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
			throw err
		}
	}

	/**
	 * Validate api token
	 */
	async validateApiToken(token: string): Promise<{ status: boolean, userId: null | string }> {
		try {
			const endpoint = `https://us-east-1.aws.data.mongodb-api.com/app/oe-phase1-tkmsy/endpoint/verifyToken?pluginName=obsidian&token=${token}`;
			const response = await axios.post(endpoint);

			if (response.status === 200 && response.data.success) {
				return {status: true, userId: response.data.userId}
			}

			throw new Error('Token validation failed.')
		} catch (error) {
			if (error?.code && error.code === 'ERR_NETWORK') {
				new OeToast(
					"Token verification failed. Please ensure you have internet connection."
				);
			}

			console.error("Token validation failed.");

			return {status: false, userId: null}
		}
	}

	/**
	 * Sync file images
	 *
	 * @param data
	 *
	 * @returns
	 */
	async syncImages(data: object) {
		try {
			const endpoint = `https://us-east-1.aws.data.mongodb-api.com/app/oe-phase1-tkmsy/endpoint/syncImages?pluginName=obsidian&token=${this.apiToken}`;

			const response =  await axios.post(endpoint, data)

			if(response.status === 200 && response.data.success){
				return response.data.filePath as string;
			}

			throw new Error('Unable to sync file images.');
		}catch (error){
			let message = "Unable to sync file images.";

			if (error["code"] === "ERR_NETWORK") {
				message = "Failed to sync image. Please ensure you have internet connection.";
			}

			new OeToast(message)

			throw error
		}
	}

	async syncAllImages(files: MarkdownAndImageInputPayloadMap): Promise<MarkdownAndRemoteUrlMap> {
		try {
			const endpoint = `https://us-east-1.aws.data.mongodb-api.com/app/oe-phase1-tkmsy/endpoint/syncImages?pluginName=obsidian&token=${this.apiToken}`;

			const response: AxiosResponse =  await axios.post(endpoint, {files: files})

			if(response.status === 200 && response.data.success){
				return response.data.mapMarkdownRepresentationAndRemoteUrl as MarkdownAndRemoteUrlMap
			}

			throw new Error('Unable to sync file images.');
		}catch (error){
			let message = "Unable to sync file images.";

			if (error["code"] === "ERR_NETWORK") {
				message = "Failed to sync image. Please ensure you have internet connection.";
			}

			new OeToast(message)
			throw error;
		}
	}
}

export { OnlyEverApi };
