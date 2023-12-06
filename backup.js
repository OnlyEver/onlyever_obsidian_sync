exports = async function (req, res) {
    let databaseInfo = context.values.get('database_info');
    const serviceName = databaseInfo.serviceName;
    const dbName = databaseInfo.databaseName;

    let userId = "";
    let fileSyncTime = {};
    let syncedFiles = [];
    let newFiles = [];
    let syncCount = 0;

    try {
        const mongodb = context.services.get(serviceName).db(dbName);
        userId = context.user.id;

        const userObject = await mongodb.collection('_users').findOne({_user_id: userId});

        const globalSourceCollection = mongodb.collection("_global_sources");
        const userSourcesCollection = mongodb.collection("_user_sources");
        const files = JSON.parse(req.body.text(), userId);

        for (const file in files) {
            const fileData = files[file];

            // NOTE By Momik: By assigning fileData = files[file], fileData contains all the properties and value that is already sent from obsidian.
            // This detail is easy to miss. I keep searching where and how I assigned properties : source_type and description.
            fileData['ext_owner'] = userId;
            fileData['_owner'] = userObject._id;
            fileData['_created_by'] = userId;
            fileData['_access_to'] = [userId];

            if (fileData['internal_links'] && fileData['internal_links'].length > 0) {
                fileData['internal_links'] = await resolveInternalLinkIdIfExist(fileData['internal_links'], globalSourceCollection)
            }

            if (await noteAlreadyExists(userId, fileData, globalSourceCollection)) {
                const existingData = await getExistingNote(userId, fileData['slug'], globalSourceCollection)
                fileSyncTime[fileData['title']] = null;
                fileData['mtime'] = new Date()

                if (noteHasBeenEdited(fileData, existingData) || noteHasDifferentTitle(fileData, existingData)) {

                    await updateNote(fileData, globalSourceCollection);

                    fileSyncTime[fileData['title']] = fileData['mtime'];
                    syncedFiles.push(fileData['title']);
                    syncCount = syncCount + 1;
                }

                if(noteWasDeletedInApp(existingData['_access_to'], userId)){
                    await userSourcesCollection.updateOne({"_source": existingData._id, '_saved_by': userId}, {"$set": {in_local: true}})
                }

            } else {
                fileData['published'] = false;
                fileData['ctime'] = new Date()
                fileData['mtime'] = new Date()

                newFiles.push(fileData['title']);

                const insert = await globalSourceCollection.insertOne(fileData);

                const sourceData = getPreparedSourceData(userId, userObject._id, insert['insertedId'])

                await userSourcesCollection.insertOne(sourceData);

                syncCount = syncCount + 1;
                fileSyncTime[fileData['title']] = new Date();
            }
        }
    } catch (err) {
        console.error("Error occurred while executing:", err);

        return {error: err.message};
    }

    return {
        success: true,
        message: 'Notes synced successfully.',
        data: {'fileSyncTime': fileSyncTime, 'syncCount': syncCount, 'syncedFiles': syncedFiles, 'newFIles': newFiles}
    };
};


async function noteAlreadyExists(userId, fileData, globalSourceCollection) {
    return fileData['slug'] && await globalSourceCollection.findOne({"slug": fileData["slug"], "_created_by": userId})
}

async function updateNote(fileData, globalSourceCollection) {
    return await globalSourceCollection.updateOne({"slug": fileData["slug"]}, {"$set": fileData});
}

async function getExistingNote(userId, fileSlug, globalSourceCollection) {
    return await globalSourceCollection.findOne({"slug": fileSlug, "_created_by": userId});
}

function noteHasBeenEdited(fileData, existingData) {
    return fileData['mtime'] > existingData['mtime']
}

function noteHasDifferentTitle(fileData, existingData) {
    return fileData['title'] !== existingData['title']
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
    const slugsOnly = internalLinks.map((internalLink) => internalLink.slug)

    const resultArray = await globalSourceCollection.find({'slug': {$in: slugsOnly}}).toArray()

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

function noteWasDeletedInApp(accessTo, userId){
    return !accessTo.includes(userId)
}
