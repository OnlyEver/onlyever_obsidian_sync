exports = async function (arg) {
	const databaseInfo = context.values.get('database_info');
	const userId = context.user.id;
	const serviceName = databaseInfo.serviceName;
	const dbName = databaseInfo.databaseName;
	const mongodb = context.services.get(serviceName).db(dbName);

	/**
	 * NOTE By Momik:
	 * This function uses script based Authentication, the payload (arg) can only be accessed by: arg.body.text().
	 */
	const {files, canOverride} = JSON.parse(arg.body.text())

	console.log(JSON.stringify(files))

	let fileSyncTime = {};
	let syncedFiles = [];
	let newFiles = [];
	let syncCount = 0;
	let replacementNotes = [];

	const usersCollection = mongodb.collection("_users");
	const globalSourceCollection = mongodb.collection("_global_sources");
	const userSourcesCollection = mongodb.collection("_user_sources");

	const userObject = await usersCollection.findOne({_user_id: userId});

	try {
		if (canOverride) {
			console.log('overwrite workflow')
			const updatePromises = Object.values(files).map(fileData => updateNote(fileData, globalSourceCollection));

			await Promise.all(updatePromises);
		} else {
			console.log('inside')
			for (const file in files) {
				const fileData = files[file];
				console.log(fileData['title'])

				/**
				 * NOTE By Momik:
				 * By assigning fileData = files[file], fileData contains all the properties and value that is already sent from obsidian.
				 * This detail is easy to miss. I keep searching where and how I assigned properties : source_type and description.
				 */
				fileData['ext_owner'] = userId;
				fileData['_owner'] = userObject._id;
				fileData['_created_by'] = userId;
				fileData['_access_to'] = [userId];

				let slug = noteRenamed(fileData) ? createFileSlug(userId, fileData['tempTitle']) : createFileSlug(userId, fileData['title'])

				if (fileData['internal_links'] && fileData['internal_links'].length > 0) {
					fileData['internal_links'] = await resolveInternalLinkIdIfExist(fileData['internal_links'], globalSourceCollection)
				}

				const existingGlobalSourceObject = await getGlobalSourceWithThisSlug(userId, slug, globalSourceCollection)

				if (existingGlobalSourceObject) {
					console.log('GS exists case')
					fileData['slug'] = slug
					fileData['mtime'] = new Date()
					fileSyncTime[fileData['title']] = null
					console.log(JSON.stringify(existingGlobalSourceObject))

					if (isObsidianNote(existingGlobalSourceObject)) {
						console.log('obsidian note ho')
						if (noteRenamed(fileData)) {
							console.log('Note renamed case')
							const allOtherNotesWhereThisNoteIsLinked = await getAllOtherNotesWhereThisNoteIsLinked(slug, globalSourceCollection)
							exit();

						}

						delete fileData.tempTitle;
						delete fileData.filePath;
						delete fileData.fileCtime;

						console.log(JSON.stringify(fileCtime))
						exit();
						await updateNote(fileData, globalSourceCollection)

						if (noteWasDeletedInApp(existingGlobalSourceObject)) {
							await userSourcesCollection.updateOne({
								"_source": existingGlobalSourceObject._id,
								'_saved_by': userId
							}, {"$set": {in_local: true}})
						}
					} else {
						fileData['canOverwrite'] = true
						replacementNotes.push(fileData)
					}
				} else {
					console.log('completely new note case')
					fileData['published'] = false;
					fileData['ctime'] = new Date()
					fileData['slug'] = slug

					newFiles.push(fileData['title']);

					delete fileData.tempTitle;
					console.log(JSON.stringify(fileData))
					delete fileData.filePath;
					console.log(JSON.stringify(fileData))
					delete fileData.fileCtime;
					console.log(JSON.stringify(fileData))
					const insert = await globalSourceCollection.insertOne(fileData);

					const sourceData = getPreparedSourceData(userId, userObject._id, insert['insertedId'])

					await userSourcesCollection.insertOne(sourceData);

					syncCount = syncCount + 1;
					fileSyncTime[fileData['title']] = new Date();
				}
			}
		}
	} catch (err) {
		console.error("Error occurred while executing:", err);

		return {
			success: false,
			message: 'Sync failed.',
			data: {}
		};
	}

	return {
		success: true,
		message: 'Notes synced successfully.',
		data: {
			'fileSyncTime': fileSyncTime,
			'syncCount': syncCount,
			'syncedFiles': syncedFiles,
			'newFiles': newFiles,
			'replacementNotes': replacementNotes
		}
	};
};

async function getGlobalSourceWithThisSlug(userId, slug, globalSourceCollection) {
	return globalSourceCollection.findOne({
		"slug": slug,
		"_created_by": userId,
		"source_type": "text"
	});
}

function getPreparedSourceData(userId, userObjectId, insertId) {
	return {
		"_saved_by": userId,
		"_user": userObjectId,
		"_source": insertId,
		"in_local": true,
		date_added: new Date(),
		source_review_interactions: {
			review_state: 1,
			last_review_date: new Date()
		}
	};
}

async function resolveInternalLinkIdIfExist(internalLinks, globalSourceCollection) {
	const slugsArray = internalLinks.map((internalLink) => internalLink.slug)

	const resultArray = await globalSourceCollection.find({'slug': {$in: slugsArray}}).toArray()

	for (let i = 0; i < internalLinks.length; i++) {
		for (let j = 0; j < resultArray.length; j++) {
			if (internalLinks[i].slug === resultArray[j].slug) {
				internalLinks[i].id = (resultArray[j]._id).toString()
				break;
			}
		}
	}

	return internalLinks
}

async function updateNote(fileData, globalSourceCollection) {
	return await globalSourceCollection.updateOne({"slug": fileData["slug"]}, {"$set": fileData});
}

function createFileSlug(userId, title) {
	title = title.toLowerCase();
	title = title.replace(/\s+/g, '_');

	return `${userId}-${title}`;
}

function noteRenamed(fileData) {
	return fileData['tempTitle'] && fileData['title'] !== fileData['tempTitle']
}

function noteWasDeletedInApp(sourceObject, userId) {
	return !sourceObject['access_to'].includes(userId)
}

function isObsidianNote(sourceObject) {
	return sourceObject.source_type === 'text' &&
		sourceObject.source_category.category === 'notes' &&
		sourceObject.source_category.sub_category === 'obsidian'
}

function getAllOtherNotesWhereThisNoteIsLinked(slug, globalSourceCollection) {

}
