import axios, {AxiosResponse} from "axios";
import {App, Notice} from "obsidian";
import {ApiResponse, OeSyncResponse, OeSyncResponseData} from "../interfaces";

class OnlyEverApi {
	app: App;
	apiToken: string;

	constructor(apiToken: string) {
		this.app = app;
		this.apiToken = apiToken;
	}

	/**
	 * Syncs Multiple file with only ever atlas
	 *
	 * @param files
	 * @param canOverwrite
	 *
	 */
	async syncFiles(files: object[], canOverwrite = false): Promise<OeSyncResponseData | false> {
		try {
			const endpoint = `https://us-east-1.aws.data.mongodb-api.com/app/oe-phase1-tkmsy/endpoint/notes?pluginName=obsidian&token=${this.apiToken}`;

			if(files.length > 0){
				const res: AxiosResponse  =  await axios.post(endpoint, {
					files: files,
					canOverwrite: canOverwrite
				})
                const syncResponse: OeSyncResponse = res.data as OeSyncResponse

                if(syncResponse.success){
                    new Notice(syncResponse.message, 2000)

                    return syncResponse.data
                }

				new Notice(syncResponse.message, 2000);
			}

			return false
		} catch (error) {
			let message =  'Note sync failed. Please ensure you have correct plugin token in the settings.';

			if(error['code'] === 'ERR_NETWORK'){
				message = "Note sync failed. Please ensure you have internet connection."
			}

			new Notice(message)

			return false;
		}
	}

	/**
	 * Validate api token
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
					if ((res?.data as ApiResponse)?.success) {
						return { status:true, userId: res.data.userId };
					}

					return { status:true, userId: ''};
				})
				.catch((err) => {
					if (err["code"] === "ERR_NETWORK") {
						new Notice(
							"Token verification failed. Please ensure you have internet connection."
						);

						return {status: false, userId: ''};
					}

					return {status: false, userId: ''};
				});
		} catch (err) {
			return { status: false, userId: ''}
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
					if ((res?.data as ApiResponse).success) {
						return res.data.filePath;
					} else {
						new Notice(
							"Notes sync failed. Please ensure you have correct plugin token in the settings."
						);
					}

					return;
				}).catch((err)=>{
					new Notice('Unable to sync file images');
				})
		}catch (e){
			new Notice('Syncing image failed');
		}
	}
}

export { OnlyEverApi };
